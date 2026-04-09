import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getMapDashboard, getMapOptions, getTeamMapOptions } from '../api'
import { MultiObjectHeatmap } from '../components/MultiObjectHeatmap'
import { MultiObjectPaceChart } from '../components/MultiObjectPaceChart'
import { PillToggle } from '../components/PillToggle'
import { compareMatchOptionDesc } from '../lib/matchOptions'
import { StatusBadge } from '../components/StatusBadge'
import { getTeamDisplayName } from '../lib/teamName'
import type {
  DashboardFilters,
  DashboardMatchOption,
  DashboardObjectFilters,
  DashboardObjectResponse,
  MapOptionsResponse,
  TimeRangeInfo,
  TeamMapObjectOptionsResponse,
} from '../types'
import styles from './MapDashboardPage.module.css'

type MapDashboardPageProps = {
  mapName: string
  dataRevision: number
  onBack: () => void
}

type DraftObject = {
  id: string
  teamSlug?: string
  filters: DashboardObjectFilters
}

type HeatmapSide = NonNullable<DashboardFilters['side']>

let objectSeed = 0

const OBJECT_PALETTE = [
  {
    line: '#22d3ee',
    fill: 'rgba(34, 211, 238, 0.18)',
    siteA: '#67e8f9',
    siteB: '#22d3ee',
    siteC: '#0ea5e9',
  },
  {
    line: '#fb7185',
    fill: 'rgba(251, 113, 133, 0.2)',
    siteA: '#fda4af',
    siteB: '#fb7185',
    siteC: '#e11d48',
  },
  {
    line: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.2)',
    siteA: '#fcd34d',
    siteB: '#f59e0b',
    siteC: '#d97706',
  },
  {
    line: '#a78bfa',
    fill: 'rgba(167, 139, 250, 0.2)',
    siteA: '#c4b5fd',
    siteB: '#a78bfa',
    siteC: '#7c3aed',
  },
]

const EMPTY_FILTERS: DashboardObjectFilters = {
  phase: 'all',
  perspective: 'team_kills',
  subject: 'killer',
  include_post_round: true,
  include_ability: true,
  tournamentIds: [],
  opponents: [],
  matchIds: [],
}

const EMPTY_GLOBAL_FILTERS: DashboardFilters = {
  phase: 'all',
  perspective: 'team_kills',
  subject: 'killer',
  include_post_round: true,
  include_ability: true,
}

const DEFAULT_HEATMAP_SIDES: HeatmapSide[] = ['atk', 'def']
const HEATMAP_TIME_THROTTLE_MS = 150
const HEATMAP_TIME_EPSILON = 0.05

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isClose(a: number, b: number, epsilon = HEATMAP_TIME_EPSILON): boolean {
  return Math.abs(a - b) <= epsilon
}

function createDraftObject(filters?: DashboardObjectFilters, teamSlug?: string): DraftObject {
  objectSeed += 1
  return {
    id: `compare-object-${objectSeed}`,
    teamSlug,
    filters: filters
      ? {
          ...filters,
          tournamentIds: [...filters.tournamentIds],
          opponents: [...filters.opponents],
          matchIds: [...filters.matchIds],
        }
      : { ...EMPTY_FILTERS },
  }
}

// ── Helpers ─────────────────────────────────────────────────

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return <input type="checkbox" ref={ref} checked={checked} onChange={onChange} />
}

type SourcePickerProps = {
  options: TeamMapObjectOptionsResponse | undefined
  matchIds: string[]
  onChange: (next: { tournamentIds: string[]; matchIds: string[] }) => void
}

function SourcePicker({ options, matchIds, onChange }: SourcePickerProps) {
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set())

  const tournamentGroups = useMemo(() => {
    function normalizeOptional(value: string | null | undefined): string | null {
      if (typeof value !== 'string') {
        return null
      }
      const compact = value.trim()
      return compact.length > 0 ? compact : null
    }

    const groups = new Map<
      string,
      {
        tournamentId: string | null
        tournamentName: string
        matches: DashboardMatchOption[]
        opponents: Map<string, { name: string; matches: DashboardMatchOption[] }>
      }
    >()

    for (const match of options?.matches ?? []) {
      const tournamentId = normalizeOptional(match.tournamentId)
      const tournamentName =
        normalizeOptional(match.tournamentName) ?? tournamentId ?? 'Unlabeled tournament'
      const tournamentKey = tournamentId ?? '__unknown_tournament__'
      let tournament = groups.get(tournamentKey)
      if (!tournament) {
        tournament = {
          tournamentId,
          tournamentName,
          matches: [],
          opponents: new Map(),
        }
        groups.set(tournamentKey, tournament)
      } else if (tournament.tournamentName === tournament.tournamentId && match.tournamentName) {
        tournament.tournamentName = match.tournamentName
      }

      tournament.matches.push(match)
      const opponentName = getTeamDisplayName(match.opponentName, match.opponentSlug)
      const opponent = tournament.opponents.get(match.opponentSlug)
      if (opponent) {
        opponent.matches.push(match)
      } else {
        tournament.opponents.set(match.opponentSlug, { name: opponentName, matches: [match] })
      }
    }

    return [...groups.entries()]
      .map(([key, tournament]) => {
        const matches = [...tournament.matches].sort(compareMatchOptionDesc)
        const opponents = [...tournament.opponents.entries()]
          .map(([slug, opponent]) => ({
            slug,
            name: opponent.name,
            matches: [...opponent.matches].sort(compareMatchOptionDesc),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        return {
          key,
          tournamentId: tournament.tournamentId,
          name: tournament.tournamentName,
          matches,
          opponents,
        }
      })
      .sort((left, right) => {
        const leftUnknown = left.tournamentId === null
        const rightUnknown = right.tournamentId === null
        if (leftUnknown !== rightUnknown) {
          return leftUnknown ? 1 : -1
        }
        const leftTop = left.matches[0]
        const rightTop = right.matches[0]
        if (leftTop && rightTop) {
          const byRecent = compareMatchOptionDesc(leftTop, rightTop)
          if (byRecent !== 0) {
            return byRecent
          }
        }
        return left.name.localeCompare(right.name)
      })
  }, [options])

  const tournamentIdByMatchId = useMemo(() => {
    const output = new Map<string, string>()
    for (const match of options?.matches ?? []) {
      if (typeof match.tournamentId !== 'string') {
        continue
      }
      const compact = match.tournamentId.trim()
      if (!compact) {
        continue
      }
      output.set(match.matchId, compact)
    }
    return output
  }, [options])

  const matchIdSet = useMemo(() => new Set(matchIds), [matchIds])
  const totalMatches = tournamentGroups.reduce((acc, group) => acc + group.matches.length, 0)

  function emit(nextMatchIdSet: Set<string>) {
    const nextTournamentIdSet = new Set<string>()
    for (const matchId of nextMatchIdSet) {
      const tournamentId = tournamentIdByMatchId.get(matchId)
      if (tournamentId) {
        nextTournamentIdSet.add(tournamentId)
      }
    }
    onChange({
      tournamentIds: [...nextTournamentIdSet],
      matchIds: [...nextMatchIdSet],
    })
  }

  function toggleMatch(matchId: string) {
    const next = new Set(matchIdSet)
    if (next.has(matchId)) {
      next.delete(matchId)
    } else {
      next.add(matchId)
    }
    emit(next)
  }

  function toggleTournament(matches: DashboardMatchOption[]) {
    const ids = matches.map((match) => match.matchId)
    const allSelected = ids.every((id) => matchIdSet.has(id))
    const next = new Set(matchIdSet)
    if (allSelected) {
      ids.forEach((id) => next.delete(id))
    } else {
      ids.forEach((id) => next.add(id))
    }
    emit(next)
  }

  function toggleOpponent(matches: DashboardMatchOption[]) {
    const ids = matches.map((m) => m.matchId)
    const allSelected = ids.every((id) => matchIdSet.has(id))
    const next = new Set(matchIdSet)
    if (allSelected) ids.forEach((id) => next.delete(id))
    else ids.forEach((id) => next.add(id))
    emit(next)
  }

  function toggleExpandTournament(tournamentKey: string) {
    setExpandedTournaments((cur) => {
      const next = new Set(cur)
      if (next.has(tournamentKey)) {
        next.delete(tournamentKey)
      } else {
        next.add(tournamentKey)
      }
      return next
    })
  }

  function toggleExpandOpponent(tournamentKey: string, opponentSlug: string) {
    const key = `${tournamentKey}:${opponentSlug}`
    setExpandedOpponents((cur) => {
      const next = new Set(cur)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function formatMatchLabel(match: DashboardMatchOption): string {
    return match.matchDateCode ? `${match.matchDateCode}-${match.matchId}` : match.matchId
  }

  return (
    <div className={styles.sourcePicker}>
      <div className={styles.sourcePickerHeader}>
        <span className={styles.fieldLabel}>Data source</span>
        {matchIds.length > 0 ? (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onChange({ tournamentIds: [], matchIds: [] })}
          >
            Selected {matchIds.length}/{totalMatches} matches · Clear
          </button>
        ) : (
          <span className={styles.sourceAll}>All {totalMatches} matches</span>
        )}
      </div>

      <div className={styles.sourceTree}>
        {!options && <p className={styles.sourceHint}>Select a team first</p>}
        {options && tournamentGroups.length === 0 && <p className={styles.sourceHint}>No match data available</p>}
        {tournamentGroups.map((tournament) => {
          const selectedMatchCount = tournament.matches.filter((match) =>
            matchIdSet.has(match.matchId),
          ).length
          const allSelected = selectedMatchCount === tournament.matches.length && tournament.matches.length > 0
          const someSelected = selectedMatchCount > 0 && !allSelected
          const tournamentOpen = expandedTournaments.has(tournament.key)
          return (
            <div key={tournament.key} className={styles.tournamentGroup}>
              <div className={styles.tournamentRow}>
                <button
                  type="button"
                  className={`${styles.expandBtn} ${tournamentOpen ? styles.expandBtnOpen : ''}`}
                  onClick={() => toggleExpandTournament(tournament.key)}
                  aria-label={tournamentOpen ? 'Collapse' : 'Expand'}
                >
                  ▸
                </button>
                <label className={styles.checkRow}>
                  <IndeterminateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => toggleTournament(tournament.matches)}
                  />
                  <span className={styles.tournamentName}>{tournament.name}</span>
                  <span className={styles.oppCount}>{tournament.matches.length}</span>
                </label>
              </div>
              {tournamentOpen && (
                <div className={styles.opponentTree}>
                  {tournament.opponents.map((opponent) => {
                    const opponentSelectedCount = opponent.matches.filter((match) =>
                      matchIdSet.has(match.matchId),
                    ).length
                    const opponentAllSelected =
                      opponentSelectedCount === opponent.matches.length && opponent.matches.length > 0
                    const opponentSomeSelected = opponentSelectedCount > 0 && !opponentAllSelected
                    const opponentExpandKey = `${tournament.key}:${opponent.slug}`
                    const opponentOpen = expandedOpponents.has(opponentExpandKey)
                    return (
                      <div key={opponentExpandKey} className={styles.oppGroup}>
                        <div className={styles.oppRow}>
                          <button
                            type="button"
                            className={`${styles.expandBtn} ${opponentOpen ? styles.expandBtnOpen : ''}`}
                            onClick={() => toggleExpandOpponent(tournament.key, opponent.slug)}
                            aria-label={opponentOpen ? 'Collapse' : 'Expand'}
                          >
                            ▸
                          </button>
                          <label className={styles.checkRow}>
                            <IndeterminateCheckbox
                              checked={opponentAllSelected}
                              indeterminate={opponentSomeSelected}
                              onChange={() => toggleOpponent(opponent.matches)}
                            />
                            <span className={styles.oppName}>{opponent.name}</span>
                            <span className={styles.oppCount}>{opponent.matches.length}</span>
                          </label>
                        </div>
                        {opponentOpen && (
                          <div className={styles.matchList}>
                            {opponent.matches.map((match) => (
                              <label
                                key={match.matchId}
                                className={`${styles.checkRow} ${styles.matchRow}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={matchIdSet.has(match.matchId)}
                                  onChange={() => toggleMatch(match.matchId)}
                                />
                                <span className={styles.matchDate}>{formatMatchLabel(match)}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function MapDashboardPage({ mapName, dataRevision, onBack }: MapDashboardPageProps) {
  const [mapOptions, setMapOptions] = useState<MapOptionsResponse | null>(null)
  const [objects, setObjects] = useState<DraftObject[]>([])
  const [globalFilters, setGlobalFilters] = useState<DashboardFilters>(EMPTY_GLOBAL_FILTERS)
  const [dashboardObjects, setDashboardObjects] = useState<DashboardObjectResponse[]>([])
  const [optionsByTeam, setOptionsByTeam] = useState<Record<string, TeamMapObjectOptionsResponse>>(
    {},
  )
  const [metaError, setMetaError] = useState<string | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [visibleObjectIds, setVisibleObjectIds] = useState<string[]>([])
  const [heatmapSite, setHeatmapSite] = useState<'A' | 'B' | 'C' | undefined>(undefined)
  const [heatmapSides, setHeatmapSides] = useState<HeatmapSide[]>(DEFAULT_HEATMAP_SIDES)
  const [heatmapTimeDraft, setHeatmapTimeDraft] = useState<{ min: number; max: number } | null>(
    null,
  )
  const heatmapTimeTimerRef = useRef<number | null>(null)
  const heatmapTimePendingRef = useRef<
    { min: number; max: number; range: TimeRangeInfo } | null
  >(null)
  const heatmapTimeLastCommittedRef = useRef(0)

  const validObjects = useMemo(() => objects.filter((item) => item.teamSlug), [objects])
  const dashboardById = useMemo(
    () => Object.fromEntries(dashboardObjects.map((item) => [item.id, item])),
    [dashboardObjects],
  )
  const paletteByObjectId = useMemo(
    () =>
      Object.fromEntries(
        objects.map((item, index) => [item.id, OBJECT_PALETTE[index % OBJECT_PALETTE.length]]),
      ),
    [objects],
  )
  const resolvedMapName = mapOptions?.mapName ?? mapName
  const resolvedHeatmapSide = useMemo<DashboardFilters['side']>(() => {
    if (!heatmapSides.length || heatmapSides.length >= 2) {
      return undefined
    }
    return heatmapSides[0]
  }, [heatmapSides])
  const resolvedGlobalFilters = useMemo<DashboardFilters>(
    () => ({
      ...globalFilters,
      side: resolvedHeatmapSide,
    }),
    [globalFilters, resolvedHeatmapSide],
  )
  const heatmapTimeRange = useMemo<TimeRangeInfo | null>(() => {
    const ranges = dashboardObjects
      .map((item) => item.heatmap.timeRange)
      .filter((item): item is TimeRangeInfo => {
        if (!item) return false
        if (!Number.isFinite(item.availableMin) || !Number.isFinite(item.availableMax)) return false
        return item.availableMax >= item.availableMin
      })

    if (!ranges.length) {
      return null
    }

    return {
      availableMin: Math.min(...ranges.map((item) => item.availableMin)),
      availableMax: Math.max(...ranges.map((item) => item.availableMax)),
    }
  }, [dashboardObjects])

  const cancelHeatmapTimeCommit = useCallback(() => {
    if (heatmapTimeTimerRef.current !== null) {
      window.clearTimeout(heatmapTimeTimerRef.current)
      heatmapTimeTimerRef.current = null
    }
    heatmapTimePendingRef.current = null
  }, [])

  const commitHeatmapTimeRange = useCallback(
    (nextMin: number, nextMax: number, range: TimeRangeInfo) => {
      const boundedMin = clamp(nextMin, range.availableMin, range.availableMax)
      const boundedMax = clamp(nextMax, range.availableMin, range.availableMax)
      const normalizedMin = Math.min(boundedMin, boundedMax)
      const normalizedMax = Math.max(boundedMin, boundedMax)
      const atMin = isClose(normalizedMin, range.availableMin)
      const atMax = isClose(normalizedMax, range.availableMax)
      const shouldClear = atMin && atMax
      const finalMin = shouldClear ? undefined : Math.round(normalizedMin * 10) / 10
      const finalMax = shouldClear ? undefined : Math.round(normalizedMax * 10) / 10

      setGlobalFilters((current) => {
        const sameMin =
          (current.heatmap_time_min === undefined && finalMin === undefined) ||
          (current.heatmap_time_min !== undefined &&
            finalMin !== undefined &&
            isClose(current.heatmap_time_min, finalMin))
        const sameMax =
          (current.heatmap_time_max === undefined && finalMax === undefined) ||
          (current.heatmap_time_max !== undefined &&
            finalMax !== undefined &&
            isClose(current.heatmap_time_max, finalMax))
        if (sameMin && sameMax) {
          return current
        }
        return {
          ...current,
          heatmap_time_min: finalMin,
          heatmap_time_max: finalMax,
        }
      })
    },
    [],
  )

  const scheduleHeatmapTimeCommit = useCallback(
    (nextMin: number, nextMax: number, range: TimeRangeInfo) => {
      const flushPending = () => {
        if (!heatmapTimePendingRef.current) {
          return
        }
        const pending = heatmapTimePendingRef.current
        heatmapTimePendingRef.current = null
        heatmapTimeLastCommittedRef.current = Date.now()
        commitHeatmapTimeRange(pending.min, pending.max, pending.range)
      }

      heatmapTimePendingRef.current = { min: nextMin, max: nextMax, range }
      const elapsed = Date.now() - heatmapTimeLastCommittedRef.current
      if (elapsed >= HEATMAP_TIME_THROTTLE_MS) {
        flushPending()
        return
      }
      if (heatmapTimeTimerRef.current !== null) {
        return
      }

      heatmapTimeTimerRef.current = window.setTimeout(() => {
        heatmapTimeTimerRef.current = null
        flushPending()
      }, HEATMAP_TIME_THROTTLE_MS - elapsed)
    },
    [commitHeatmapTimeRange],
  )

  useEffect(() => {
    return () => {
      cancelHeatmapTimeCommit()
    }
  }, [cancelHeatmapTimeCommit])

  useEffect(() => {
    if (!heatmapTimeRange) {
      setHeatmapTimeDraft((current) => (current ? null : current))
      if (
        globalFilters.heatmap_time_min !== undefined ||
        globalFilters.heatmap_time_max !== undefined
      ) {
        cancelHeatmapTimeCommit()
        setGlobalFilters((current) => {
          if (
            current.heatmap_time_min === undefined &&
            current.heatmap_time_max === undefined
          ) {
            return current
          }
          return {
            ...current,
            heatmap_time_min: undefined,
            heatmap_time_max: undefined,
          }
        })
      }
      return
    }

    const rawMin = globalFilters.heatmap_time_min ?? heatmapTimeRange.availableMin
    const rawMax = globalFilters.heatmap_time_max ?? heatmapTimeRange.availableMax
    const boundedMin = clamp(rawMin, heatmapTimeRange.availableMin, heatmapTimeRange.availableMax)
    const boundedMax = clamp(rawMax, heatmapTimeRange.availableMin, heatmapTimeRange.availableMax)
    const normalizedMin = Math.min(boundedMin, boundedMax)
    const normalizedMax = Math.max(boundedMin, boundedMax)

    setHeatmapTimeDraft((current) => {
      if (current && isClose(current.min, normalizedMin) && isClose(current.max, normalizedMax)) {
        return current
      }
      return { min: normalizedMin, max: normalizedMax }
    })

    const atMin = isClose(normalizedMin, heatmapTimeRange.availableMin)
    const atMax = isClose(normalizedMax, heatmapTimeRange.availableMax)
    const shouldClear = atMin && atMax
    const finalMin = shouldClear ? undefined : Math.round(normalizedMin * 10) / 10
    const finalMax = shouldClear ? undefined : Math.round(normalizedMax * 10) / 10

    const sameMin =
      (globalFilters.heatmap_time_min === undefined && finalMin === undefined) ||
      (globalFilters.heatmap_time_min !== undefined &&
        finalMin !== undefined &&
        isClose(globalFilters.heatmap_time_min, finalMin))
    const sameMax =
      (globalFilters.heatmap_time_max === undefined && finalMax === undefined) ||
      (globalFilters.heatmap_time_max !== undefined &&
        finalMax !== undefined &&
        isClose(globalFilters.heatmap_time_max, finalMax))
    if (sameMin && sameMax) {
      return
    }

    cancelHeatmapTimeCommit()
    setGlobalFilters((current) => ({
      ...current,
      heatmap_time_min: finalMin,
      heatmap_time_max: finalMax,
    }))
  }, [
    cancelHeatmapTimeCommit,
    globalFilters.heatmap_time_max,
    globalFilters.heatmap_time_min,
    heatmapTimeRange,
  ])

  useEffect(() => {
    setIsMetaLoading(true)
    setMetaError(null)
    setMapOptions(null)
    setObjects([])
    setDashboardObjects([])
    setOptionsByTeam({})
  }, [mapName])

  useEffect(() => {
    let cancelled = false
    setMetaError(null)

    async function loadMap() {
      try {
        const response = await getMapOptions(mapName)
        if (cancelled) {
          return
        }
        setMapOptions(response)
        setIsMetaLoading(false)
      } catch (error) {
        if (cancelled) {
          return
        }
        setMetaError(error instanceof Error ? error.message : 'Failed to load map information.')
        setIsMetaLoading(false)
      }
    }

    void loadMap()
    return () => {
      cancelled = true
    }
  }, [dataRevision, mapName])

  useEffect(() => {
    setOptionsByTeam({})
  }, [dataRevision])

  useEffect(() => {
    const teamsToLoad = validObjects
      .map((item) => item.teamSlug)
      .filter((teamSlug): teamSlug is string => Boolean(teamSlug && !optionsByTeam[teamSlug]))

    if (!teamsToLoad.length) {
      return
    }

    let cancelled = false
    void Promise.all(teamsToLoad.map((teamSlug) => getTeamMapOptions(mapName, teamSlug)))
      .then((responses) => {
        if (cancelled) {
          return
        }
        setOptionsByTeam((current) => ({
          ...current,
          ...Object.fromEntries(responses.map((item) => [item.team.slug, item])),
        }))
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setDashboardError(error instanceof Error ? error.message : 'Failed to load object filters.')
      })

    return () => {
      cancelled = true
    }
  }, [dataRevision, mapName, optionsByTeam, validObjects])

  useEffect(() => {
    if (!validObjects.length) {
      setDashboardObjects((current) => (current.length ? [] : current))
      setDashboardError(null)
      setIsDashboardLoading(false)
      return
    }

    let cancelled = false
    setIsDashboardLoading(true)
    setDashboardError(null)

    void getMapDashboard(mapName, {
      globalFilters: resolvedGlobalFilters,
      objects: validObjects.map((item) => {
        const filtersWithoutSite = { ...item.filters }
        delete filtersWithoutSite.site
        return {
          id: item.id,
          teamSlug: item.teamSlug!,
          filters: {
            ...filtersWithoutSite,
            phase: resolvedGlobalFilters.phase,
          },
        }
      }),
    })
      .then((response) => {
        if (cancelled) {
          return
        }
        setDashboardObjects(response.objects)
        setIsDashboardLoading(false)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setDashboardObjects([])
        setDashboardError(error instanceof Error ? error.message : 'Failed to load the map dashboard.')
        setIsDashboardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataRevision, mapName, resolvedGlobalFilters, validObjects])

  useEffect(() => {
    const ids = dashboardObjects.map((item) => item.id)
    setVisibleObjectIds((current) => {
      const filtered = current.filter((id) => ids.includes(id))
      return filtered.length ? filtered : ids
    })
  }, [dashboardObjects])

  function updateGlobalFilters(next: Partial<DashboardFilters>) {
    setGlobalFilters((current) => ({ ...current, ...next }))
  }

  function handlePhaseChange(nextPhase: DashboardFilters['phase']) {
    cancelHeatmapTimeCommit()
    setGlobalFilters((current) => ({
      ...current,
      phase: nextPhase,
      heatmap_time_min: undefined,
      heatmap_time_max: undefined,
    }))
  }

  function handleHeatmapTimeRangeChange(nextMin: number, nextMax: number) {
    if (!heatmapTimeRange) {
      return
    }
    const boundedMin = clamp(nextMin, heatmapTimeRange.availableMin, heatmapTimeRange.availableMax)
    const boundedMax = clamp(nextMax, heatmapTimeRange.availableMin, heatmapTimeRange.availableMax)
    const normalizedMin = Math.min(boundedMin, boundedMax)
    const normalizedMax = Math.max(boundedMin, boundedMax)
    setHeatmapTimeDraft({ min: normalizedMin, max: normalizedMax })
    scheduleHeatmapTimeCommit(normalizedMin, normalizedMax, heatmapTimeRange)
  }

  function updateObject(id: string, updater: (current: DraftObject) => DraftObject) {
    setObjects((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }

  function addObject() {
    setObjects((current) => (current.length >= 4 ? current : [...current, createDraftObject()]))
  }

  function copyObject(id: string) {
    setObjects((current) => {
      if (current.length >= 4) {
        return current
      }
      const source = current.find((item) => item.id === id)
      if (!source) {
        return current
      }
      return [...current, createDraftObject(source.filters, source.teamSlug)]
    })
  }

  function removeObject(id: string) {
    setObjects((current) => current.filter((item) => item.id !== id))
  }

  function toggleVisibleObject(id: string) {
    setVisibleObjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <main className={`page-shell detail-shell ${styles.root}`}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← Back to dashboard
        </button>
        <h1 className={styles.mapTitle}>{resolvedMapName}</h1>
      </div>

      {metaError ? <div className="alert-card">{metaError}</div> : null}
      {dashboardError ? <div className="alert-card">{dashboardError}</div> : null}

      <section className={`${styles.filterBar} panel`}>
        <div className="panel-header">
          <div>
            <h2>Filters</h2>
          </div>
          {isDashboardLoading ? <StatusBadge label="Refreshing charts" variant="warning" /> : null}
        </div>

        <div className={styles.filterBarBody}>
          {/* ── Left: global conditions ──────────────────────────── */}
          <div className={styles.globalSide}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionLabel}>Global filters</p>
            </div>
            <div className={styles.globalContent}>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>Phase</span>
                <PillToggle
                  options={[
                    { value: 'all', label: 'ALL' },
                    { value: 'pre_plant', label: 'Pre Plant' },
                    { value: 'post_plant', label: 'Planted' },
                  ]}
                  value={globalFilters.phase}
                  onChange={(value) => value && handlePhaseChange(value)}
                />
              </div>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>Kill event type</span>
                <div className={styles.eventTypeToggle} role="group" aria-label="Kill event type">
                  <button
                    type="button"
                    className={`${styles.eventTypePill} ${
                      globalFilters.include_post_round ? styles.eventTypePillActive : ''
                    }`}
                    aria-pressed={globalFilters.include_post_round}
                    onClick={() =>
                      updateGlobalFilters({ include_post_round: !globalFilters.include_post_round })
                    }
                  >
                    Post-Round Kills
                  </button>
                  <button
                    type="button"
                    className={`${styles.eventTypePill} ${
                      globalFilters.include_ability ? styles.eventTypePillActive : ''
                    }`}
                    aria-pressed={globalFilters.include_ability}
                    onClick={() =>
                      updateGlobalFilters({ include_ability: !globalFilters.include_ability })
                    }
                  >
                    Ability Kills
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: object selection ───────────────────────────── */}
          <div className={styles.objectSide}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionLabel}>Object selection · {objects.length} / 4</p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={addObject}
                disabled={objects.length >= 4 || isMetaLoading}
              >
                Add object
              </button>
            </div>

            <div className={styles.objectContent}>
            {!objects.length ? (
              <div className={styles.emptyState}>
                <p>Add an object first, then configure filters.</p>
              </div>
            ) : (
              <div className={styles.objectRow}>
                {objects.map((item, index) => {
                  const options = item.teamSlug ? optionsByTeam[item.teamSlug] : undefined
                  const dashboardItem = dashboardById[item.id]
                  const palette = paletteByObjectId[item.id]
                  return (
                    <article
                      key={item.id}
                      className={styles.objectCard}
                      style={{ '--card-accent': palette?.line } as React.CSSProperties}
                    >
                      <div className={styles.objectHeader}>
                        <div className={styles.objectCardInfo}>
                          <p className="eyebrow">Object {index + 1}</p>
                          <div className={styles.objectTitleRow}>
                            <span
                              className={styles.colorDot}
                              style={{ background: palette?.line }}
                            />
                            <h3>
                              {dashboardItem
                                ? getTeamDisplayName(dashboardItem.team.name, dashboardItem.team.slug)
                                : 'Select a team'}
                            </h3>
                          </div>
                        </div>
                        <div className={styles.objectActions}>
                          <button
                            type="button"
                            className="ghost-link"
                            onClick={() => copyObject(item.id)}
                            disabled={objects.length >= 4}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="ghost-link"
                            onClick={() => removeObject(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <label className={styles.inputField}>
                        <span className={styles.fieldLabel}>Team</span>
                        <select
                          value={item.teamSlug ?? ''}
                          onChange={(event) =>
                            updateObject(item.id, (current) => ({
                              ...current,
                              teamSlug: event.target.value || undefined,
                              filters: {
                                ...current.filters,
                                tournamentIds: [],
                                opponents: [],
                                matchIds: [],
                              },
                            }))
                          }
                        >
                          <option value="">Select a team</option>
                          {mapOptions?.teams.map((team) => (
                            <option key={team.slug} value={team.slug}>
                              {getTeamDisplayName(team.name, team.slug)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <SourcePicker
                        options={options}
                        matchIds={item.filters.matchIds}
                        onChange={({ tournamentIds, matchIds }) =>
                          updateObject(item.id, (current) => ({
                            ...current,
                            filters: { ...current.filters, tournamentIds, opponents: [], matchIds },
                          }))
                        }
                      />
                    </article>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <MultiObjectHeatmap
          mapName={resolvedMapName}
          objects={dashboardObjects}
          perspective={globalFilters.perspective}
          selectedSides={heatmapSides}
          subject={globalFilters.subject}
          phase={globalFilters.phase}
          visibleObjectIds={visibleObjectIds}
          paletteByObjectId={paletteByObjectId}
          site={heatmapSite}
          timeRange={heatmapTimeRange}
          timeRangeMin={heatmapTimeDraft?.min}
          timeRangeMax={heatmapTimeDraft?.max}
          onPerspectiveChange={(perspective) => updateGlobalFilters({ perspective })}
          onSidesChange={setHeatmapSides}
          onSubjectChange={(subject) => updateGlobalFilters({ subject })}
          onSiteChange={setHeatmapSite}
          onTimeRangeChange={handleHeatmapTimeRangeChange}
          onToggleObject={toggleVisibleObject}
        />
        <MultiObjectPaceChart objects={dashboardObjects} paletteByObjectId={paletteByObjectId} />
      </div>
    </main>
  )
}
