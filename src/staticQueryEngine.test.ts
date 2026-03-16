import { beforeEach, expect, it, vi } from 'vitest'

import {
  getMapDashboardFromStaticData,
  getMapOptionsFromStaticData,
  getTeamMapOptionsFromStaticData,
  listMapsFromStaticData,
} from './staticQueryEngine'
import type { StaticDatasetManifest, StaticMapShard } from './staticDataset'

const manifestFixture: StaticDatasetManifest = {
  version: 'static-dataset-v1',
  generatedAt: '2026-03-08T00:00:00Z',
  maps: [
    {
      mapName: 'Pearl',
      sampleCount: 6,
      teamCount: 2,
      lastUpdatedAt: '2026-03-11T00:00:00Z',
      shard: 'maps/pearl.json',
    },
  ],
}

const shardFixture: StaticMapShard = {
  version: 'static-dataset-v1',
  generatedAt: '2026-03-08T00:00:00Z',
  mapName: 'Pearl',
  teams: [
    { slug: 'edward-gaming', name: 'EDward Gaming' },
    { slug: 't1', name: 'T1' },
  ],
  samples: [
    {
      id: 1,
      mapName: 'Pearl',
      matchId: '598950',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      teamSlug: 'edward-gaming',
      teamName: 'EDward Gaming',
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: '260209',
      sourceUpdatedAt: '2026-03-08T00:00:00Z',
    },
    {
      id: 2,
      mapName: 'Pearl',
      matchId: '598950',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      teamSlug: 't1',
      teamName: 'T1',
      opponentSlug: 'edward-gaming',
      opponentName: 'EDward Gaming',
      matchDateCode: '260209',
      sourceUpdatedAt: '2026-03-08T00:00:00Z',
    },
    {
      id: 3,
      mapName: 'Pearl',
      matchId: '598949',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      teamSlug: 'edward-gaming',
      teamName: 'EDward Gaming',
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: '260207',
      sourceUpdatedAt: '2026-03-10T00:00:00Z',
    },
    {
      id: 4,
      mapName: 'Pearl',
      matchId: '598949',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      teamSlug: 't1',
      teamName: 'T1',
      opponentSlug: 'edward-gaming',
      opponentName: 'EDward Gaming',
      matchDateCode: '260207',
      sourceUpdatedAt: '2026-03-10T00:00:00Z',
    },
    {
      id: 5,
      mapName: 'Pearl',
      matchId: '598948',
      tournamentId: null,
      tournamentName: null,
      teamSlug: 'edward-gaming',
      teamName: 'EDward Gaming',
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: null,
      sourceUpdatedAt: '2026-03-11T00:00:00Z',
    },
    {
      id: 6,
      mapName: 'Pearl',
      matchId: '598948',
      tournamentId: null,
      tournamentName: null,
      teamSlug: 't1',
      teamName: 'T1',
      opponentSlug: 'edward-gaming',
      opponentName: 'EDward Gaming',
      matchDateCode: null,
      sourceUpdatedAt: '2026-03-11T00:00:00Z',
    },
  ],
  rounds: [
    {
      sampleId: 1,
      roundNumber: 1,
      teamSide: 'atk',
      plantSite: 'A',
      plantingTeamSlug: 'edward-gaming',
      plantRemainingTimeSec: 50,
      plantTimeBucket: 4,
    },
    {
      sampleId: 1,
      roundNumber: 2,
      teamSide: 'def',
      plantSite: 'B',
      plantingTeamSlug: 't1',
      plantRemainingTimeSec: 30,
      plantTimeBucket: 6,
    },
    {
      sampleId: 2,
      roundNumber: 1,
      teamSide: 'def',
      plantSite: 'A',
      plantingTeamSlug: 'edward-gaming',
      plantRemainingTimeSec: 50,
      plantTimeBucket: 4,
    },
    {
      sampleId: 2,
      roundNumber: 2,
      teamSide: 'atk',
      plantSite: 'B',
      plantingTeamSlug: 't1',
      plantRemainingTimeSec: 30,
      plantTimeBucket: 6,
    },
  ],
  kills: [
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
    {
      sampleId: 1,
      roundNumber: 2,
      teamSide: 'def',
      phase: 'post_plant',
      remainingTimeSec: 30,
      timeBucket: 6,
      killerTeamSlug: 't1',
      victimTeamSlug: 'edward-gaming',
      killerX: 0.62,
      killerY: 0.28,
      victimX: 0.54,
      victimY: 0.33,
      isPostRoundKill: false,
      isAbilityKill: true,
    },
    {
      sampleId: 1,
      roundNumber: 2,
      teamSide: 'def',
      phase: 'post_plant',
      remainingTimeSec: 2,
      timeBucket: 9,
      killerTeamSlug: 't1',
      victimTeamSlug: 'edward-gaming',
      killerX: 0.58,
      killerY: 0.36,
      victimX: 0.51,
      victimY: 0.39,
      isPostRoundKill: true,
      isAbilityKill: false,
    },
    {
      sampleId: 2,
      roundNumber: 1,
      teamSide: 'def',
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
    {
      sampleId: 2,
      roundNumber: 2,
      teamSide: 'atk',
      phase: 'post_plant',
      remainingTimeSec: 30,
      timeBucket: 6,
      killerTeamSlug: 't1',
      victimTeamSlug: 'edward-gaming',
      killerX: 0.62,
      killerY: 0.28,
      victimX: 0.54,
      victimY: 0.33,
      isPostRoundKill: false,
      isAbilityKill: true,
    },
    {
      sampleId: 2,
      roundNumber: 2,
      teamSide: 'atk',
      phase: 'post_plant',
      remainingTimeSec: 2,
      timeBucket: 9,
      killerTeamSlug: 't1',
      victimTeamSlug: 'edward-gaming',
      killerX: 0.58,
      killerY: 0.36,
      victimX: 0.51,
      victimY: 0.39,
      isPostRoundKill: true,
      isAbilityKill: false,
    },
  ],
}

function installFetchFixture() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname === '/data/manifest.json') {
      return new Response(JSON.stringify(manifestFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (pathname === '/data/maps/pearl.json') {
      return new Response(JSON.stringify(shardFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  })

  vi.stubGlobal('fetch', fetchMock)
}

beforeEach(() => {
  vi.restoreAllMocks()
  installFetchFixture()
})

it('lists maps and returns map/team options from static dataset', async () => {
  const maps = await listMapsFromStaticData()
  expect(maps).toEqual([
    {
      mapName: 'Pearl',
      sampleCount: 6,
      teamCount: 2,
      lastUpdatedAt: '2026-03-11T00:00:00Z',
    },
  ])

  const mapOptions = await getMapOptionsFromStaticData('pearl')
  expect(mapOptions.mapName).toBe('Pearl')
  expect(new Set(mapOptions.teams.map((team) => team.slug))).toEqual(new Set(['edward-gaming', 't1']))

  const teamOptions = await getTeamMapOptionsFromStaticData('pearl', 'edward-gaming')
  expect(teamOptions.team.slug).toBe('edward-gaming')
  expect(teamOptions.opponents).toEqual([{ slug: 't1', name: 'T1' }])
  expect(teamOptions.matches).toEqual([
    {
      matchId: '598950',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: '260209',
      updatedAt: '2026-03-08T00:00:00Z',
    },
    {
      matchId: '598949',
      tournamentId: 'tournament-1',
      tournamentName: 'VCT 2026: China Kickoff',
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: '260207',
      updatedAt: '2026-03-10T00:00:00Z',
    },
    {
      matchId: '598948',
      tournamentId: null,
      tournamentName: null,
      opponentSlug: 't1',
      opponentName: 'T1',
      matchDateCode: null,
      updatedAt: '2026-03-11T00:00:00Z',
    },
  ])
})

it('keeps compatibility when tournament fields are missing in legacy shards', async () => {
  vi.resetModules()
  const legacyShard = JSON.parse(JSON.stringify(shardFixture)) as StaticMapShard
  for (const sample of legacyShard.samples as Array<Record<string, unknown>>) {
    delete sample.tournamentId
    delete sample.tournamentName
  }
  legacyShard.mapName = 'Pearl Legacy'
  for (const sample of legacyShard.samples) {
    sample.mapName = 'Pearl Legacy'
  }
  const legacyManifest: StaticDatasetManifest = {
    version: 'static-dataset-v1',
    generatedAt: '2026-03-10T00:00:00Z',
    maps: [
      {
        mapName: 'Pearl Legacy',
        sampleCount: legacyShard.samples.length,
        teamCount: 2,
        lastUpdatedAt: '2026-03-10T00:00:00Z',
        shard: 'maps/pearl-legacy.json',
      },
    ],
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url, 'http://localhost').pathname
    if (pathname === '/data/manifest.json') {
      return new Response(JSON.stringify(legacyManifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (pathname === '/data/maps/pearl-legacy.json') {
      return new Response(JSON.stringify(legacyShard), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('Not Found', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)

  const queryEngine = await import('./staticQueryEngine')
  const teamOptions = await queryEngine.getTeamMapOptionsFromStaticData('Pearl Legacy', 'edward-gaming')
  for (const match of teamOptions.matches) {
    expect(match.tournamentId).toBeNull()
    expect(match.tournamentName).toBeNull()
  }

  vi.resetModules()
})

it('supports tournamentIds filtering and intersects with matchIds', async () => {
  const dashboard = await getMapDashboardFromStaticData('Pearl', {
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
          tournamentIds: ['tournament-1'],
          opponents: [],
          matchIds: ['598950'],
        },
      },
    ],
  })
  expect(dashboard.objects[0]?.heatmap.sampleCount).toBe(1)

  await expect(
    getMapDashboardFromStaticData('Pearl', {
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
            tournamentIds: ['tournament-1'],
            opponents: [],
            matchIds: ['598948'],
          },
        },
      ],
    }),
  ).rejects.toThrow('Team edward-gaming not found on this map.')
})

it('returns multi-object dashboard with isolated object results', async () => {
  const dashboard = await getMapDashboardFromStaticData('pearl', {
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
          tournamentIds: ['tournament-1'],
          opponents: ['t1'],
          matchIds: ['598950'],
        },
      },
      {
        id: 'obj-b',
        teamSlug: 't1',
        filters: {
          phase: 'post_plant',
          perspective: 'team_kills',
          subject: 'killer',
          include_post_round: true,
          include_ability: true,
          tournamentIds: [],
          opponents: ['edward-gaming'],
          matchIds: [],
        },
      },
    ],
  })

  expect(dashboard.mapName).toBe('Pearl')
  expect(dashboard.objects.map((item) => item.id)).toEqual(['obj-a', 'obj-b'])

  const first = dashboard.objects[0]
  const second = dashboard.objects[1]

  expect(first.team.slug).toBe('edward-gaming')
  expect(first.heatmap.pointCount).toBe(1)
  expect(first.pace.buckets.reduce((sum, bucket) => sum + bucket.teamKills, 0)).toBe(1)

  expect(second.team.slug).toBe('t1')
  expect(second.effectiveFilters.phase).toBe('post_plant')
  expect(second.heatmap.pointCount).toBe(2)
  expect(second.heatmap.links).toHaveLength(2)
  expect(second.pace.buckets.reduce((sum, bucket) => sum + bucket.teamKills, 0)).toBe(2)
})

it('returns relation links in all-kills perspective and uses links as heatmap count', async () => {
  const dashboard = await getMapDashboardFromStaticData('pearl', {
    globalFilters: {
      phase: 'all',
      perspective: 'all_kills',
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
          tournamentIds: ['tournament-1'],
          opponents: ['t1'],
          matchIds: ['598950'],
        },
      },
    ],
  })

  const item = dashboard.objects[0]
  expect(item.heatmap.links).toHaveLength(3)
  expect(item.heatmap.pointCount).toBe(3)
  expect(new Set(item.heatmap.links.map((link) => link.relation))).toEqual(
    new Set(['team_kill', 'team_death']),
  )
  expect(item.heatmap.lowConfidence).toBe(true)
})

it('applies heatmap time window filter to links in all-kills perspective', async () => {
  const dashboard = await getMapDashboardFromStaticData('Pearl', {
    globalFilters: {
      phase: 'all',
      perspective: 'all_kills',
      subject: 'killer',
      include_post_round: true,
      include_ability: true,
      heatmap_time_min: 65,
      heatmap_time_max: 75,
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
          tournamentIds: ['tournament-1'],
          opponents: ['t1'],
          matchIds: ['598950'],
        },
      },
    ],
  })

  const item = dashboard.objects[0]
  expect(item.heatmap.links).toHaveLength(1)
  expect(item.heatmap.links[0]?.timeBucket).toBe(6)
  expect(item.heatmap.pointCount).toBe(1)
})

it('applies global constraints and returns empty reason on conflict', async () => {
  const dashboard = await getMapDashboardFromStaticData('Pearl', {
    globalFilters: {
      phase: 'all',
      perspective: 'team_kills',
      subject: 'killer',
      site: 'A',
      include_post_round: false,
      include_ability: true,
      heatmap_time_min: 0,
      heatmap_time_max: 20,
    },
    objects: [
      {
        id: 'obj-a',
        teamSlug: 'edward-gaming',
        filters: {
          phase: 'all',
          perspective: 'team_kills',
          subject: 'killer',
          site: 'B',
          include_post_round: true,
          include_ability: true,
          heatmap_time_min: 40,
          heatmap_time_max: 50,
          tournamentIds: [],
          opponents: [],
          matchIds: [],
        },
      },
    ],
  })

  const item = dashboard.objects[0]
  expect(item.effectiveFilters.site).toBe('A')
  expect(item.effectiveFilters.include_post_round).toBe(false)
  expect(item.effectiveFilters.emptyReason).toBe('对象包点筛选超出了全局包点约束。')
  expect(item.heatmap.pointCount).toBe(0)
  expect(item.heatmap.emptyReason).toBe('对象包点筛选超出了全局包点约束。')
  expect(item.pace.buckets.reduce((sum, bucket) => sum + bucket.teamKills, 0)).toBe(0)
})
