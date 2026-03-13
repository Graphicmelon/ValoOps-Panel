export const STATIC_DATASET_VERSION = 'static-dataset-v1'

export type StaticManifestMap = {
  mapName: string
  sampleCount: number
  teamCount: number
  lastUpdatedAt: string
  shard: string
}

export type StaticDatasetManifest = {
  version: typeof STATIC_DATASET_VERSION
  generatedAt: string
  maps: StaticManifestMap[]
}

export type StaticTeamRow = {
  slug: string
  name: string
}

export type StaticSampleRow = {
  id: number
  mapName: string
  matchId: string
  teamSlug: string
  teamName: string
  opponentSlug: string
  opponentName: string
  matchDateCode: string | null
  sourceUpdatedAt: string
}

export type StaticRoundRow = {
  sampleId: number
  roundNumber: number
  teamSide: 'atk' | 'def'
  plantSite: 'A' | 'B' | 'C' | null
  plantingTeamSlug: string | null
  plantRemainingTimeSec: number | null
  plantTimeBucket: number | null
}

export type StaticKillEventRow = {
  sampleId: number
  roundNumber: number
  teamSide: 'atk' | 'def'
  phase: 'pre_plant' | 'post_plant'
  remainingTimeSec: number | null
  timeBucket: number | null
  killerTeamSlug: string | null
  victimTeamSlug: string | null
  killerX: number | null
  killerY: number | null
  victimX: number | null
  victimY: number | null
  isPostRoundKill: boolean | null
  isAbilityKill: boolean | null
}

export type StaticMapShard = {
  version: typeof STATIC_DATASET_VERSION
  generatedAt: string
  mapName: string
  teams: StaticTeamRow[]
  samples: StaticSampleRow[]
  rounds: StaticRoundRow[]
  kills: StaticKillEventRow[]
}
