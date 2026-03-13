export type SideFilter = 'atk' | 'def'
export type PhaseFilter = 'all' | 'pre_plant' | 'post_plant'
export type PerspectiveFilter = 'team_kills' | 'team_deaths' | 'all_kills'
export type SubjectFilter = 'killer' | 'victim'

export type TeamSummary = {
  slug: string
  name: string
  mapCount: number
  matchCount: number
  lastUpdatedAt: string
}

export type MapSummary = {
  mapName: string
  sampleCount: number
  teamCount: number
  lastUpdatedAt: string
}

export type MapTeamOption = {
  slug: string
  name: string
  sampleCount: number
  lastUpdatedAt: string
}

export type MapOptionsResponse = {
  mapName: string
  teams: MapTeamOption[]
}

export type DashboardOpponentOption = {
  slug: string
  name: string
}

export type DashboardMatchOption = {
  matchId: string
  opponentSlug: string
  opponentName: string
  matchDateCode: string | null
  updatedAt: string
}

export type TeamMapObjectOptionsResponse = {
  mapName: string
  team: TeamSummary
  opponents: DashboardOpponentOption[]
  matches: DashboardMatchOption[]
}

export type DashboardFilters = {
  side?: SideFilter
  phase: PhaseFilter
  site?: 'A' | 'B' | 'C'
  perspective: PerspectiveFilter
  subject: SubjectFilter
  include_post_round: boolean
  include_ability: boolean
  time_bucket?: number
  heatmap_time_min?: number
  heatmap_time_max?: number
}

export type DashboardObjectFilters = DashboardFilters & {
  opponents: string[]
  matchIds: string[]
}

export type EffectiveDashboardFilters = DashboardObjectFilters & {
  emptyReason: string | null
}

export type DashboardObjectRequest = {
  id: string
  teamSlug: string
  filters: DashboardObjectFilters
}

export type DashboardRequest = {
  globalFilters: DashboardFilters
  objects: DashboardObjectRequest[]
}

export type HeatmapPoint = {
  x: number
  y: number
  roundNumber: number
  phase: 'pre_plant' | 'post_plant'
  timeBucket: number | null
  site: 'A' | 'B' | 'C' | null
  relation: 'team_kill' | 'team_death'
}

export type HeatmapLinkEvent = {
  killerX: number
  killerY: number
  victimX: number
  victimY: number
  roundNumber: number
  phase: 'pre_plant' | 'post_plant'
  timeBucket: number | null
  site: 'A' | 'B' | 'C' | null
  relation: 'team_kill' | 'team_death'
}

export type TimeRangeInfo = {
  availableMin: number
  availableMax: number
}

export type DashboardHeatmapResponse = {
  selectedFilters: EffectiveDashboardFilters
  mapName: string
  pointCount: number
  sampleCount: number
  lowConfidence: boolean
  emptyReason: string | null
  timeRange: TimeRangeInfo | null
  points: HeatmapPoint[]
  links: HeatmapLinkEvent[]
}

export type DashboardPaceBucket = {
  index: number
  label: string
  teamKills: number
  teamDeaths: number
  teamPlants: number
  opponentPlants: number
  teamPlantsA: number
  teamPlantsB: number
  teamPlantsC: number
  effectiveRounds: number
  killsPer100Rounds: number
  deathsPer100Rounds: number
  plantsPer100Rounds: number
}

export type DashboardPaceResponse = {
  selectedFilters: EffectiveDashboardFilters
  lowConfidence: boolean
  emptyReason: string | null
  buckets: DashboardPaceBucket[]
}

export type DashboardObjectResponse = {
  id: string
  team: TeamSummary
  effectiveFilters: EffectiveDashboardFilters
  heatmap: DashboardHeatmapResponse
  pace: DashboardPaceResponse
}

export type DashboardResponse = {
  mapName: string
  globalFilters: DashboardFilters
  objects: DashboardObjectResponse[]
}
