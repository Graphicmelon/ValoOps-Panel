import { loadManifest, loadMapShardByName, refreshDatasetIfUpdated } from './staticDataStore'
import type {
  StaticKillEventRow,
  StaticMapShard,
  StaticRoundRow,
  StaticSampleRow,
} from './staticDataset'
import type {
  DashboardFilters,
  DashboardHeatmapResponse,
  DashboardMatchOption,
  DashboardObjectFilters,
  DashboardObjectRequest,
  DashboardObjectResponse,
  DashboardOpponentOption,
  DashboardPaceBucket,
  DashboardPaceResponse,
  DashboardRequest,
  DashboardResponse,
  EffectiveDashboardFilters,
  HeatmapLinkEvent,
  HeatmapPoint,
  MapOptionsResponse,
  MapSummary,
  MapTeamOption,
  TeamMapObjectOptionsResponse,
  TeamSummary,
  TimeRangeInfo,
} from './types'

const ROUND_DURATION_SEC = 100
const PACE_BUCKET_SIZE_SEC = 10
const PACE_BUCKET_COUNT = ROUND_DURATION_SEC / PACE_BUCKET_SIZE_SEC
const PACE_BUCKET_MAX_INDEX = PACE_BUCKET_COUNT - 1

const PACE_CONFIDENCE_ROUND_THRESHOLD = 20
const HEATMAP_CONFIDENCE_KILL_THRESHOLD = 30

type TeamContext = {
  team: TeamSummary
  samples: StaticSampleRow[]
  rounds: StaticRoundRow[]
  kills: StaticKillEventRow[]
}

type ResolvedFilters = {
  filters: EffectiveDashboardFilters
  emptyReason: string | null
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const compact = value.trim()
  return compact.length > 0 ? compact : null
}

function mapNameEquals(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function maxText(values: readonly string[]): string {
  return values.reduce<string>((max, current) => (current > max ? current : max), '')
}

function compareMatchOptionDesc(left: DashboardMatchOption, right: DashboardMatchOption): number {
  if (left.matchDateCode !== right.matchDateCode) {
    if (left.matchDateCode === null) {
      return 1
    }
    if (right.matchDateCode === null) {
      return -1
    }
    const byDate = right.matchDateCode.localeCompare(left.matchDateCode)
    if (byDate !== 0) {
      return byDate
    }
  }

  const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt)
  if (byUpdatedAt !== 0) {
    return byUpdatedAt
  }

  const byMatchId = right.matchId.localeCompare(left.matchId)
  if (byMatchId !== 0) {
    return byMatchId
  }

  return 0
}

function makeRoundKey(sampleId: number, roundNumber: number): string {
  return `${sampleId}:${roundNumber}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function makeBucketLabel(index: number): string {
  if (index < 0 || index > PACE_BUCKET_MAX_INDEX) {
    throw new Error(`Bucket index out of range: ${index}`)
  }

  if (index === 0) {
    return `0-${PACE_BUCKET_SIZE_SEC}s`
  }

  const low = index * PACE_BUCKET_SIZE_SEC + 1
  const high = Math.min((index + 1) * PACE_BUCKET_SIZE_SEC, ROUND_DURATION_SEC)
  return `${low}-${high}s`
}

function matchSide(
  value: 'atk' | 'def',
  expected: DashboardFilters['side'] | DashboardObjectFilters['side'] | undefined,
): boolean {
  return expected === undefined || value === expected
}

function loadContext(
  shard: StaticMapShard,
  teamSlug: string,
  mapName: string,
  {
    tournamentIds,
    opponents,
    matchIds,
    includeRounds,
    includeKills,
  }: {
    tournamentIds?: readonly string[]
    opponents?: readonly string[]
    matchIds?: readonly string[]
    includeRounds: boolean
    includeKills: boolean
  },
): TeamContext {
  const team = shard.teams.find((item) => item.slug === teamSlug)
  if (!team) {
    throw new Error('Team not found.')
  }

  let samples = shard.samples.filter(
    (sample) => sample.teamSlug === teamSlug && mapNameEquals(sample.mapName, mapName),
  )

  const requestedTournamentIds = dedupeStrings(
    (tournamentIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0),
  )
  if (requestedTournamentIds.length > 0) {
    const tournamentIdSet = new Set(requestedTournamentIds)
    samples = samples.filter((sample) => {
      const tournamentId = normalizeOptionalString(sample.tournamentId)
      return tournamentId !== null && tournamentIdSet.has(tournamentId)
    })
  }

  const requestedOpponents = dedupeStrings(opponents ?? [])
  if (requestedOpponents.length > 0) {
    const opponentSet = new Set(requestedOpponents)
    samples = samples.filter((sample) => opponentSet.has(sample.opponentSlug))
  }

  const requestedMatchIds = dedupeStrings(matchIds ?? [])
  if (requestedMatchIds.length > 0) {
    const matchIdSet = new Set(requestedMatchIds)
    samples = samples.filter((sample) => matchIdSet.has(sample.matchId))
  }

  const sampleIdSet = new Set(samples.map((sample) => sample.id))
  const rounds = includeRounds
    ? shard.rounds.filter((row) => sampleIdSet.has(row.sampleId))
    : ([] as StaticRoundRow[])
  const kills = includeKills
    ? shard.kills.filter((row) => sampleIdSet.has(row.sampleId))
    : ([] as StaticKillEventRow[])

  return {
    team: {
      slug: team.slug,
      name: team.name,
      mapCount: new Set(samples.map((sample) => sample.mapName)).size,
      matchCount: new Set(samples.map((sample) => sample.matchId)).size,
      lastUpdatedAt: maxText(samples.map((sample) => sample.sourceUpdatedAt)),
    },
    samples,
    rounds,
    kills,
  }
}

function filterRoundsGeneric(
  context: TeamContext,
  {
    side,
    site,
    timeBucket,
  }: {
    side: DashboardFilters['side']
    site: DashboardFilters['site']
    timeBucket: DashboardFilters['time_bucket']
  },
): StaticRoundRow[] {
  let rows = context.rounds.filter((row) => matchSide(row.teamSide, side))
  if (site) {
    rows = rows.filter((row) => row.plantSite === site)
  }
  if (timeBucket !== undefined) {
    rows = rows.filter((row) => row.plantTimeBucket === timeBucket)
  }
  return rows
}

function filterPlantsGeneric(
  context: TeamContext,
  {
    side,
    site,
    timeBucket,
    includeTimeBucket,
  }: {
    side: DashboardFilters['side']
    site: DashboardFilters['site']
    timeBucket: DashboardFilters['time_bucket']
    includeTimeBucket: boolean
  },
): StaticRoundRow[] {
  let rows = filterRoundsGeneric(context, {
    side,
    site,
    timeBucket: undefined,
  }).filter((row) => row.plantingTeamSlug !== null)

  if (site) {
    rows = rows.filter((row) => row.plantSite === site)
  }

  if (includeTimeBucket && timeBucket !== undefined) {
    rows = rows.filter((row) => row.plantTimeBucket === timeBucket)
  }

  return rows
}

function filterKillsGeneric(
  context: TeamContext,
  {
    teamSlug,
    side,
    phase,
    perspective,
    site,
    includePostRound,
    includeAbility,
    timeBucket,
    includeTimeBucket,
  }: {
    teamSlug: string
    side: DashboardFilters['side']
    phase: DashboardFilters['phase']
    perspective: DashboardFilters['perspective']
    site: DashboardFilters['site']
    includePostRound: boolean
    includeAbility: boolean
    timeBucket: DashboardFilters['time_bucket']
    includeTimeBucket: boolean
  },
): StaticKillEventRow[] {
  let rows = context.kills.filter((row) => matchSide(row.teamSide, side))

  if (phase !== 'all') {
    rows = rows.filter((row) => row.phase === phase)
  }

  if (includeTimeBucket && timeBucket !== undefined) {
    rows = rows.filter((row) => row.timeBucket === timeBucket)
  }

  if (!includePostRound) {
    rows = rows.filter((row) => row.isPostRoundKill !== true)
  }

  if (!includeAbility) {
    rows = rows.filter((row) => row.isAbilityKill !== true)
  }

  if (site) {
    const roundLookup = new Map<string, StaticRoundRow>()
    for (const row of context.rounds) {
      roundLookup.set(makeRoundKey(row.sampleId, row.roundNumber), row)
    }

    rows = rows.filter((row) => {
      const round = roundLookup.get(makeRoundKey(row.sampleId, row.roundNumber))
      return round !== undefined && round.plantSite === site
    })
  }

  if (perspective === 'team_kills') {
    rows = rows.filter((row) => row.killerTeamSlug === teamSlug)
  } else if (perspective === 'team_deaths') {
    rows = rows.filter((row) => row.victimTeamSlug === teamSlug)
  }

  return rows
}

function resolveSubsetEnum(
  globalValue: DashboardFilters['phase'],
  objectValue: DashboardObjectFilters['phase'],
  neutralValue: DashboardFilters['phase'],
  conflictReason: string,
): [DashboardFilters['phase'], string | null] {
  if (globalValue === neutralValue) {
    return [objectValue, null]
  }
  if (objectValue === neutralValue || objectValue === globalValue) {
    return [globalValue, null]
  }
  return [globalValue, conflictReason]
}

function resolveStrictEnum<T extends string | number>(
  globalValue: T | undefined,
  objectValue: T | undefined,
  conflictReason: string,
): [T | undefined, string | null] {
  if (globalValue === undefined) {
    return [objectValue, null]
  }
  if (objectValue === undefined || objectValue === globalValue) {
    return [globalValue, null]
  }
  return [globalValue, conflictReason]
}

function resolveDashboardFilters(
  globalFilters: DashboardFilters,
  objectFilters: DashboardObjectFilters,
): ResolvedFilters {
  const reasons: string[] = []

  const [phase, phaseConflict] = resolveSubsetEnum(
    globalFilters.phase,
    objectFilters.phase,
    'all',
    '对象阶段筛选超出了全局阶段约束。',
  )
  if (phaseConflict) {
    reasons.push(phaseConflict)
  }

  const [side, sideConflict] = resolveStrictEnum(
    globalFilters.side,
    objectFilters.side,
    '对象身份筛选超出了全局身份约束。',
  )
  if (sideConflict) {
    reasons.push(sideConflict)
  }

  const [site, siteConflict] = resolveStrictEnum(
    globalFilters.site,
    objectFilters.site,
    '对象包点筛选超出了全局包点约束。',
  )
  if (siteConflict) {
    reasons.push(siteConflict)
  }

  const [timeBucket, bucketConflict] = resolveStrictEnum(
    globalFilters.time_bucket,
    objectFilters.time_bucket,
    '对象时段筛选超出了全局时段约束。',
  )
  if (bucketConflict) {
    reasons.push(bucketConflict)
  }

  const minCandidates = [globalFilters.heatmap_time_min, objectFilters.heatmap_time_min].filter(
    (value): value is number => value !== undefined,
  )
  const maxCandidates = [globalFilters.heatmap_time_max, objectFilters.heatmap_time_max].filter(
    (value): value is number => value !== undefined,
  )

  const heatmapTimeMin = minCandidates.length ? Math.max(...minCandidates) : undefined
  const heatmapTimeMax = maxCandidates.length ? Math.min(...maxCandidates) : undefined

  if (
    heatmapTimeMin !== undefined &&
    heatmapTimeMax !== undefined &&
    heatmapTimeMin > heatmapTimeMax
  ) {
    reasons.push('对象热力图时间区间与全局区间没有交集。')
  }

  const effectiveFilters: EffectiveDashboardFilters = {
    side,
    phase,
    perspective: globalFilters.perspective || objectFilters.perspective,
    subject: globalFilters.subject || objectFilters.subject,
    site,
    include_post_round: globalFilters.include_post_round && objectFilters.include_post_round,
    include_ability: globalFilters.include_ability && objectFilters.include_ability,
    time_bucket: timeBucket,
    heatmap_time_min: heatmapTimeMin,
    heatmap_time_max: heatmapTimeMax,
    tournamentIds: dedupeStrings(
      objectFilters.tournamentIds.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
    opponents: dedupeStrings(objectFilters.opponents),
    matchIds: dedupeStrings(objectFilters.matchIds),
    emptyReason: reasons[0] ?? null,
  }

  return {
    filters: effectiveFilters,
    emptyReason: effectiveFilters.emptyReason,
  }
}

function collectHeatmapPoints(
  context: TeamContext,
  filters: EffectiveDashboardFilters,
): {
  points: HeatmapPoint[]
  links: HeatmapLinkEvent[]
  sampleCount: number
  timeRange: TimeRangeInfo | null
} {
  const filteredRounds = filterRoundsGeneric(context, {
    side: filters.side,
    site: filters.site,
    timeBucket: filters.time_bucket,
  })

  const roundLookup = new Map<string, StaticRoundRow>()
  const plantTimeLookup = new Map<string, number>()
  for (const row of filteredRounds) {
    const key = makeRoundKey(row.sampleId, row.roundNumber)
    roundLookup.set(key, row)
    if (row.plantRemainingTimeSec !== null) {
      plantTimeLookup.set(key, row.plantRemainingTimeSec)
    }
  }

  const kills = filterKillsGeneric(context, {
    teamSlug: context.team.slug,
    side: filters.side,
    phase: filters.phase,
    perspective: filters.perspective,
    site: filters.site,
    includePostRound: filters.include_post_round,
    includeAbility: filters.include_ability,
    timeBucket: filters.time_bucket,
    includeTimeBucket: true,
  })

  const computeRelativeTime = (kill: StaticKillEventRow): number | null => {
    const remaining = kill.remainingTimeSec
    if (remaining === null) {
      return null
    }

    if (filters.phase === 'all') {
      return round2(ROUND_DURATION_SEC - remaining)
    }

    const plantTime = plantTimeLookup.get(makeRoundKey(kill.sampleId, kill.roundNumber))
    if (plantTime === undefined) {
      return null
    }

    if (filters.phase === 'pre_plant') {
      return round2(remaining - plantTime)
    }

    return round2(plantTime - remaining)
  }

  const validTimes = kills
    .map((kill) => computeRelativeTime(kill))
    .filter((value): value is number => value !== null && value >= 0)

  const timeRange: TimeRangeInfo | null = validTimes.length
    ? {
        availableMin: round1(Math.min(...validTimes)),
        availableMax: round1(Math.max(...validTimes)),
      }
    : null

  let filteredKills = kills
  if (filters.heatmap_time_min !== undefined || filters.heatmap_time_max !== undefined) {
    filteredKills = kills.filter((kill) => {
      const relative = computeRelativeTime(kill)
      if (relative === null) {
        return false
      }
      if (filters.heatmap_time_min !== undefined && relative < filters.heatmap_time_min) {
        return false
      }
      if (filters.heatmap_time_max !== undefined && relative > filters.heatmap_time_max) {
        return false
      }
      return true
    })
  }

  const points: HeatmapPoint[] = []
  const links: HeatmapLinkEvent[] = []
  for (const kill of filteredKills) {
    const round = roundLookup.get(makeRoundKey(kill.sampleId, kill.roundNumber))
    if (!round) {
      continue
    }

    const relation = kill.killerTeamSlug === context.team.slug ? 'team_kill' : 'team_death'
    if (
      kill.killerX !== null &&
      kill.killerY !== null &&
      kill.victimX !== null &&
      kill.victimY !== null
    ) {
      links.push({
        killerX: kill.killerX,
        killerY: kill.killerY,
        victimX: kill.victimX,
        victimY: kill.victimY,
        roundNumber: kill.roundNumber,
        phase: kill.phase,
        timeBucket: kill.timeBucket,
        site: round.plantSite,
        relation,
      })
    }

    const x = filters.subject === 'killer' ? kill.killerX : kill.victimX
    const y = filters.subject === 'killer' ? kill.killerY : kill.victimY

    if (x === null || y === null) {
      continue
    }

    points.push({
      x,
      y,
      roundNumber: kill.roundNumber,
      phase: kill.phase,
      timeBucket: kill.timeBucket,
      site: round.plantSite,
      relation,
    })
  }

  return {
    points,
    links,
    sampleCount: new Set(filteredKills.map((kill) => kill.sampleId)).size,
    timeRange,
  }
}

function buildPaceBuckets(
  teamSlug: string,
  filteredRounds: StaticRoundRow[],
  filteredKills: StaticKillEventRow[],
  filteredPlants: StaticRoundRow[],
): DashboardPaceBucket[] {
  const effectiveRounds = filteredRounds.length
  const denominator = Math.max(effectiveRounds, 1)

  return Array.from({ length: PACE_BUCKET_COUNT }).map((_, index) => {
    const killsInBucket = filteredKills.filter((kill) => kill.timeBucket === index)
    const plantsInBucket = filteredPlants.filter((round) => round.plantTimeBucket === index)

    const teamKills = killsInBucket.filter((kill) => kill.killerTeamSlug === teamSlug).length
    const teamDeaths = killsInBucket.filter((kill) => kill.victimTeamSlug === teamSlug).length
    const teamPlants = plantsInBucket.filter((round) => round.plantingTeamSlug === teamSlug).length
    const opponentPlants = plantsInBucket.filter((round) => round.plantingTeamSlug !== teamSlug).length

    const teamPlantsA = plantsInBucket.filter(
      (round) => round.plantingTeamSlug === teamSlug && round.plantSite === 'A',
    ).length
    const teamPlantsB = plantsInBucket.filter(
      (round) => round.plantingTeamSlug === teamSlug && round.plantSite === 'B',
    ).length
    const teamPlantsC = plantsInBucket.filter(
      (round) => round.plantingTeamSlug === teamSlug && round.plantSite === 'C',
    ).length

    return {
      index,
      label: makeBucketLabel(index),
      teamKills,
      teamDeaths,
      teamPlants,
      opponentPlants,
      teamPlantsA,
      teamPlantsB,
      teamPlantsC,
      effectiveRounds,
      killsPer100Rounds: round2((teamKills * 100) / denominator),
      deathsPer100Rounds: round2((teamDeaths * 100) / denominator),
      plantsPer100Rounds: round2((teamPlants * 100) / denominator),
    }
  })
}

function emptyPaceBuckets(): DashboardPaceBucket[] {
  return Array.from({ length: PACE_BUCKET_COUNT }).map((_, index) => ({
    index,
    label: makeBucketLabel(index),
    teamKills: 0,
    teamDeaths: 0,
    teamPlants: 0,
    opponentPlants: 0,
    teamPlantsA: 0,
    teamPlantsB: 0,
    teamPlantsC: 0,
    effectiveRounds: 0,
    killsPer100Rounds: 0,
    deathsPer100Rounds: 0,
    plantsPer100Rounds: 0,
  }))
}

function buildDashboardHeatmap(
  context: TeamContext,
  resolved: ResolvedFilters,
): DashboardHeatmapResponse {
  const { points, links, sampleCount, timeRange } = collectHeatmapPoints(context, resolved.filters)
  const isAllKillsPerspective = resolved.filters.perspective === 'all_kills'
  const renderedCount = isAllKillsPerspective ? links.length : points.length

  let emptyReason = resolved.emptyReason
  if (!emptyReason && renderedCount === 0) {
    emptyReason = isAllKillsPerspective
      ? '当前对象在全局约束后没有可绘制的击杀关系。'
      : '当前对象在全局约束后没有可绘制的击杀坐标。'
  }

  return {
    selectedFilters: resolved.filters,
    mapName: context.samples[0]?.mapName ?? '',
    pointCount: renderedCount,
    sampleCount: resolved.emptyReason ? 0 : sampleCount,
    lowConfidence: renderedCount < HEATMAP_CONFIDENCE_KILL_THRESHOLD,
    emptyReason,
    timeRange,
    points: resolved.emptyReason ? [] : points,
    links: resolved.emptyReason ? [] : links,
  }
}

function buildDashboardPace(context: TeamContext, resolved: ResolvedFilters): DashboardPaceResponse {
  if (resolved.emptyReason) {
    return {
      selectedFilters: resolved.filters,
      lowConfidence: true,
      emptyReason: resolved.emptyReason,
      buckets: emptyPaceBuckets(),
    }
  }

  const filteredRounds = filterRoundsGeneric(context, {
    side: 'atk',
    site: resolved.filters.site,
    timeBucket: resolved.filters.time_bucket,
  })

  const filteredKills = filterKillsGeneric(context, {
    teamSlug: context.team.slug,
    side: 'atk',
    phase: resolved.filters.phase,
    perspective: 'all_kills',
    site: resolved.filters.site,
    includePostRound: resolved.filters.include_post_round,
    includeAbility: resolved.filters.include_ability,
    timeBucket: resolved.filters.time_bucket,
    includeTimeBucket: true,
  })

  const filteredPlants = filterPlantsGeneric(context, {
    side: 'atk',
    site: resolved.filters.site,
    timeBucket: resolved.filters.time_bucket,
    includeTimeBucket: true,
  })

  return {
    selectedFilters: resolved.filters,
    lowConfidence: filteredRounds.length < PACE_CONFIDENCE_ROUND_THRESHOLD,
    emptyReason: null,
    buckets: buildPaceBuckets(context.team.slug, filteredRounds, filteredKills, filteredPlants),
  }
}

export async function listMapsFromStaticData(): Promise<MapSummary[]> {
  const manifest = await loadManifest()
  return manifest.maps.map((map) => ({
    mapName: map.mapName,
    sampleCount: map.sampleCount,
    teamCount: map.teamCount,
    lastUpdatedAt: map.lastUpdatedAt,
  }))
}

export async function getMapOptionsFromStaticData(mapName: string): Promise<MapOptionsResponse> {
  const { shard, mapName: resolvedMapName } = await loadMapShardByName(mapName)

  const samplesByTeam = new Map<string, StaticSampleRow[]>()
  for (const sample of shard.samples) {
    const current = samplesByTeam.get(sample.teamSlug)
    if (current) {
      current.push(sample)
    } else {
      samplesByTeam.set(sample.teamSlug, [sample])
    }
  }

  const teams: MapTeamOption[] = [...samplesByTeam.entries()].map(([teamSlug, samples]) => ({
    slug: teamSlug,
    name: samples[0]?.teamName ?? teamSlug,
    sampleCount: samples.length,
    lastUpdatedAt: maxText(samples.map((sample) => sample.sourceUpdatedAt)),
  }))

  teams.sort((a, b) => {
    if (b.sampleCount !== a.sampleCount) {
      return b.sampleCount - a.sampleCount
    }
    return a.name.localeCompare(b.name)
  })

  if (teams.length === 0) {
    throw new Error('Map not found.')
  }

  return {
    mapName: resolvedMapName,
    teams,
  }
}

export async function getTeamMapOptionsFromStaticData(
  mapName: string,
  teamSlug: string,
): Promise<TeamMapObjectOptionsResponse> {
  const { shard } = await loadMapShardByName(mapName)
  const context = loadContext(shard, teamSlug, mapName, {
    includeRounds: false,
    includeKills: false,
  })

  if (context.samples.length === 0) {
    throw new Error('Team not found on this map.')
  }

  const opponents = new Map<string, DashboardOpponentOption>()
  const matches = new Map<string, DashboardMatchOption>()

  for (const sample of context.samples) {
    if (!opponents.has(sample.opponentSlug)) {
      opponents.set(sample.opponentSlug, {
        slug: sample.opponentSlug,
        name: sample.opponentName,
      })
    }

    const candidate: DashboardMatchOption = {
      matchId: sample.matchId,
      tournamentId: normalizeOptionalString(sample.tournamentId),
      tournamentName: normalizeOptionalString(sample.tournamentName),
      opponentSlug: sample.opponentSlug,
      opponentName: sample.opponentName,
      matchDateCode: sample.matchDateCode,
      updatedAt: sample.sourceUpdatedAt,
    }

    const current = matches.get(sample.matchId)
    if (!current || compareMatchOptionDesc(candidate, current) < 0) {
      matches.set(sample.matchId, candidate)
    }
  }

  return {
    mapName: context.samples[0].mapName,
    team: context.team,
    opponents: [...opponents.values()].sort((a, b) => a.name.localeCompare(b.name)),
    matches: [...matches.values()].sort(compareMatchOptionDesc),
  }
}

export async function getMapDashboardFromStaticData(
  mapName: string,
  payload: DashboardRequest,
): Promise<DashboardResponse> {
  if (!payload.objects.length) {
    throw new Error('Map not found.')
  }

  const { shard } = await loadMapShardByName(mapName)
  const responses: DashboardObjectResponse[] = []
  let resolvedMapName: string | null = null

  for (const item of payload.objects) {
    const context = loadContext(shard, item.teamSlug, mapName, {
      tournamentIds: item.filters.tournamentIds,
      opponents: item.filters.opponents,
      matchIds: item.filters.matchIds,
      includeRounds: true,
      includeKills: true,
    })

    if (context.samples.length === 0) {
      throw new Error(`Team ${item.teamSlug} not found on this map.`)
    }

    resolvedMapName = resolvedMapName ?? context.samples[0].mapName
    const resolvedFilters = resolveDashboardFilters(payload.globalFilters, item.filters)

    responses.push({
      id: item.id,
      team: context.team,
      effectiveFilters: resolvedFilters.filters,
      heatmap: buildDashboardHeatmap(context, resolvedFilters),
      pace: buildDashboardPace(context, resolvedFilters),
    })
  }

  if (!resolvedMapName) {
    throw new Error('Map not found.')
  }

  return {
    mapName: resolvedMapName,
    globalFilters: payload.globalFilters,
    objects: responses,
  }
}

export async function checkDatasetUpdateFromStaticData(): Promise<boolean> {
  return refreshDatasetIfUpdated()
}

export function withDefaultObjectFilters(item: DashboardObjectRequest): DashboardObjectRequest {
  return {
    ...item,
    filters: {
      phase: item.filters.phase,
      perspective: item.filters.perspective,
      subject: item.filters.subject,
      include_post_round: item.filters.include_post_round,
      include_ability: item.filters.include_ability,
      side: item.filters.side,
      site: item.filters.site,
      time_bucket: item.filters.time_bucket,
      heatmap_time_min: item.filters.heatmap_time_min,
      heatmap_time_max: item.filters.heatmap_time_max,
      tournamentIds: dedupeStrings(
        item.filters.tournamentIds.map((value) => value.trim()).filter((value) => value.length > 0),
      ),
      opponents: dedupeStrings(item.filters.opponents),
      matchIds: dedupeStrings(item.filters.matchIds),
    },
  }
}
