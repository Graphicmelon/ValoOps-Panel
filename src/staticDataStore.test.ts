import { beforeEach, expect, it, vi } from 'vitest'

import type { StaticDatasetManifest, StaticMapShard } from './staticDataset'
import type { DashboardRequest } from './types'

type FetchRecord = {
  pathname: string
  cacheMode: RequestCache | undefined
}

function makeManifest(generatedAt: string): StaticDatasetManifest {
  return {
    version: 'static-dataset-v1',
    generatedAt,
    maps: [
      {
        mapName: 'Pearl',
        sampleCount: 1,
        teamCount: 2,
        lastUpdatedAt: generatedAt,
        shard: 'maps/pearl.json',
      },
    ],
  }
}

function makeShard(generatedAt: string, kills: StaticMapShard['kills']): StaticMapShard {
  return {
    version: 'static-dataset-v1',
    generatedAt,
    mapName: 'Pearl',
    teams: [
      { slug: 'edward-gaming', name: 'EDward Gaming' },
      { slug: 't1', name: 'T1' },
    ],
    samples: [
      {
        id: 1,
        mapName: 'Pearl',
        matchId: 'match-1',
        teamSlug: 'edward-gaming',
        teamName: 'EDward Gaming',
        opponentSlug: 't1',
        opponentName: 'T1',
        matchDateCode: '260209',
        sourceUpdatedAt: generatedAt,
      },
    ],
    rounds: [
      {
        sampleId: 1,
        roundNumber: 1,
        teamSide: 'atk',
        plantSite: 'A',
        plantingTeamSlug: 'edward-gaming',
        plantRemainingTimeSec: 40,
        plantTimeBucket: 5,
      },
    ],
    kills,
  }
}

function installFetchFixture(
  getManifest: () => StaticDatasetManifest,
  getShard: () => StaticMapShard,
  records: FetchRecord[],
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url, 'http://localhost').pathname
    records.push({ pathname, cacheMode: init?.cache })

    if (pathname === '/data/manifest.json') {
      return new Response(JSON.stringify(getManifest()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (pathname === '/data/maps/pearl.json') {
      return new Response(JSON.stringify(getShard()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  })

  vi.stubGlobal('fetch', fetchMock)
}

const dashboardPayload: DashboardRequest = {
  globalFilters: {
    phase: 'all',
    perspective: 'team_kills',
    subject: 'killer',
    include_post_round: true,
    include_ability: true,
  },
  objects: [
    {
      id: 'obj-a',
      teamSlug: 'edward-gaming',
      filters: {
        phase: 'all',
        perspective: 'team_kills',
        subject: 'killer',
        include_post_round: true,
        include_ability: true,
        tournamentIds: [],
        opponents: [],
        matchIds: [],
      },
    },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

it('returns false and keeps shard cache when manifest is unchanged', async () => {
  const currentManifest = makeManifest('2026-03-08T00:00:00Z')
  const currentShard = makeShard('2026-03-08T00:00:00Z', [])
  const records: FetchRecord[] = []
  installFetchFixture(() => currentManifest, () => currentShard, records)

  const store = await import('./staticDataStore')

  await store.loadMapShardByName('Pearl')
  expect(records.filter((record) => record.pathname === '/data/maps/pearl.json')).toHaveLength(1)

  const hasUpdate = await store.refreshDatasetIfUpdated()
  expect(hasUpdate).toBe(false)

  await store.loadMapShardByName('Pearl')
  expect(records.filter((record) => record.pathname === '/data/maps/pearl.json')).toHaveLength(1)
  expect(records.filter((record) => record.pathname === '/data/manifest.json')).toHaveLength(2)
})

it('clears cache on manifest update and serves updated dashboard data', async () => {
  let currentManifest = makeManifest('2026-03-08T00:00:00Z')
  let currentShard = makeShard('2026-03-08T00:00:00Z', [])
  const records: FetchRecord[] = []
  installFetchFixture(() => currentManifest, () => currentShard, records)

  const store = await import('./staticDataStore')
  const queryEngine = await import('./staticQueryEngine')

  const before = await queryEngine.getMapDashboardFromStaticData('Pearl', dashboardPayload)
  expect(before.objects[0].heatmap.pointCount).toBe(0)

  currentManifest = makeManifest('2026-03-09T00:00:00Z')
  currentShard = makeShard('2026-03-09T00:00:00Z', [
    {
      sampleId: 1,
      roundNumber: 1,
      teamSide: 'atk',
      phase: 'pre_plant',
      remainingTimeSec: 80,
      timeBucket: 1,
      killerTeamSlug: 'edward-gaming',
      victimTeamSlug: 't1',
      killerX: 0.32,
      killerY: 0.48,
      victimX: 0.45,
      victimY: 0.44,
      isPostRoundKill: false,
      isAbilityKill: false,
    },
  ])

  const hasUpdate = await store.refreshDatasetIfUpdated()
  expect(hasUpdate).toBe(true)

  const after = await queryEngine.getMapDashboardFromStaticData('Pearl', dashboardPayload)
  expect(after.objects[0].heatmap.pointCount).toBe(1)
  expect(records.filter((record) => record.pathname === '/data/maps/pearl.json')).toHaveLength(2)
})

it('deduplicates concurrent refresh checks to one manifest re-fetch', async () => {
  let currentManifest = makeManifest('2026-03-08T00:00:00Z')
  const currentShard = makeShard('2026-03-08T00:00:00Z', [])
  const records: FetchRecord[] = []
  installFetchFixture(() => currentManifest, () => currentShard, records)

  const store = await import('./staticDataStore')
  await store.loadManifest()

  currentManifest = makeManifest('2026-03-09T00:00:00Z')
  const results = await Promise.all([
    store.refreshDatasetIfUpdated(),
    store.refreshDatasetIfUpdated(),
    store.refreshDatasetIfUpdated(),
  ])

  expect(results).toEqual([true, true, true])
  expect(records.filter((record) => record.pathname === '/data/manifest.json')).toHaveLength(2)
  expect(
    records.filter(
      (record) => record.pathname === '/data/manifest.json' && record.cacheMode === 'no-store',
    ),
  ).toHaveLength(1)
})
