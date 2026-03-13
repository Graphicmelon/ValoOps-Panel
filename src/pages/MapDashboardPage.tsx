import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getMapDashboard, getMapOptions, getTeamMapOptions } from '../api'
import { MultiObjectHeatmap } from '../components/MultiObjectHeatmap'
import { MultiObjectPaceChart } from '../components/MultiObjectPaceChart'
import { PillToggle } from '../components/PillToggle'
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
      ? { ...filters, opponents: [...filters.opponents], matchIds: [...filters.matchIds] }
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
  onChange: (matchIds: string[]) => void
}

function SourcePicker({ options, matchIds, onChange }: SourcePickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; matches: DashboardMatchOption[] }>()
    for (const opp of options?.opponents ?? []) {
      map.set(opp.slug, { name: getTeamDisplayName(opp.name, opp.slug), matches: [] })
    }
    for (const match of options?.matches ?? []) {
      map.get(match.opponentSlug)?.matches.push(match)
    }
    return [...map.entries()].map(([slug, data]) => ({ slug, ...data }))
  }, [options])

  const matchIdSet = useMemo(() => new Set(matchIds), [matchIds])
  const totalMatches = groups.reduce((acc, g) => acc + g.matches.length, 0)

  function toggleMatch(matchId: string) {
    const next = new Set(matchIdSet)
    if (next.has(matchId)) {
      next.delete(matchId)
    } else {
      next.add(matchId)
    }
    onChange([...next])
  }

  function toggleOpponent(slug: string, matches: DashboardMatchOption[]) {
    const ids = matches.map((m) => m.matchId)
    const allSelected = ids.every((id) => matchIdSet.has(id))
    const next = new Set(matchIdSet)
    if (allSelected) ids.forEach((id) => next.delete(id))
    else ids.forEach((id) => next.add(id))
    onChange([...next])
  }

  function toggleExpand(slug: string) {
    setExpanded((cur) => {
      const next = new Set(cur)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
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
        <span className={styles.fieldLabel}>数据来源</span>
        {matchIds.length > 0 ? (
          <button type="button" className={styles.clearBtn} onClick={() => onChange([])}>
            已选 {matchIds.length}/{totalMatches} 场 · 清除
          </button>
        ) : (
          <span className={styles.sourceAll}>全部 {totalMatches} 场</span>
        )}
      </div>

      <div className={styles.sourceTree}>
        {!options && <p className={styles.sourceHint}>请先选择队伍</p>}
        {options && groups.length === 0 && <p className={styles.sourceHint}>暂无对战数据</p>}
        {groups.map(({ slug, name, matches }) => {
          const selCount = matches.filter((m) => matchIdSet.has(m.matchId)).length
          const allSel = selCount === matches.length && matches.length > 0
          const someSel = selCount > 0 && !allSel
          const isOpen = expanded.has(slug)
          return (
            <div key={slug} className={styles.oppGroup}>
              <div className={styles.oppRow}>
                <button
                  type="button"
                  className={`${styles.expandBtn} ${isOpen ? styles.expandBtnOpen : ''}`}
                  onClick={() => toggleExpand(slug)}
                  aria-label={isOpen ? '收起' : '展开'}
                >
                  ▸
                </button>
                <label className={styles.checkRow}>
                  <IndeterminateCheckbox
                    checked={allSel}
                    indeterminate={someSel}
                    onChange={() => toggleOpponent(slug, matches)}
                  />
                  <span className={styles.oppName}>{name}</span>
                  <span className={styles.oppCount}>{matches.length}</span>
                </label>
              </div>
              {isOpen && (
                <div className={styles.matchList}>
                  {matches.map((match) => (
                    <label key={match.matchId} className={`${styles.checkRow} ${styles.matchRow}`}>
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
        setMetaError(error instanceof Error ? error.message : '加载地图信息失败。')
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
        setDashboardError(error instanceof Error ? error.message : '加载对象筛选项失败。')
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
        setDashboardError(error instanceof Error ? error.message : '加载地图看板失败。')
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
          ← 返回看板
        </button>
        <h1 className={styles.mapTitle}>{resolvedMapName}</h1>
      </div>

      {metaError ? <div className="alert-card">{metaError}</div> : null}
      {dashboardError ? <div className="alert-card">{dashboardError}</div> : null}

      <section className={`${styles.filterBar} panel`}>
        <div className="panel-header">
          <div>
            <h2>筛选</h2>
          </div>
          {isDashboardLoading ? <StatusBadge label="图表刷新中" variant="warning" /> : null}
        </div>

        <div className={styles.filterBarBody}>
          {/* ── Left: global conditions ──────────────────────────── */}
          <div className={styles.globalSide}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionLabel}>全局条件</p>
            </div>
            <div className={styles.globalContent}>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>阶段</span>
                <PillToggle
                  options={[
                    { value: 'all', label: '全阶段' },
                    { value: 'pre_plant', label: '下包前' },
                    { value: 'post_plant', label: '下包后' },
                  ]}
                  value={globalFilters.phase}
                  onChange={(value) => value && handlePhaseChange(value)}
                />
              </div>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>击杀事件类型</span>
                <div className={styles.eventTypeToggle} role="group" aria-label="击杀事件类型">
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
                    回合后击杀
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
                    技能击杀
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: object selection ───────────────────────────── */}
          <div className={styles.objectSide}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionLabel}>对象选择 · {objects.length} / 4</p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={addObject}
                disabled={objects.length >= 4 || isMetaLoading}
              >
                添加对象
              </button>
            </div>

            <div className={styles.objectContent}>
            {!objects.length ? (
              <div className={styles.emptyState}>
                <p>先添加一个对象，再配置筛选条件。</p>
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
                          <p className="eyebrow">对象 {index + 1}</p>
                          <div className={styles.objectTitleRow}>
                            <span
                              className={styles.colorDot}
                              style={{ background: palette?.line }}
                            />
                            <h3>
                              {dashboardItem
                                ? getTeamDisplayName(dashboardItem.team.name, dashboardItem.team.slug)
                                : '待选择队伍'}
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
                            复制
                          </button>
                          <button
                            type="button"
                            className="ghost-link"
                            onClick={() => removeObject(item.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      <label className={styles.inputField}>
                        <span className={styles.fieldLabel}>队伍</span>
                        <select
                          value={item.teamSlug ?? ''}
                          onChange={(event) =>
                            updateObject(item.id, (current) => ({
                              ...current,
                              teamSlug: event.target.value || undefined,
                              filters: {
                                ...current.filters,
                                opponents: [],
                                matchIds: [],
                              },
                            }))
                          }
                        >
                          <option value="">请选择队伍</option>
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
                        onChange={(matchIds) =>
                          updateObject(item.id, (current) => ({
                            ...current,
                            filters: { ...current.filters, opponents: [], matchIds },
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
