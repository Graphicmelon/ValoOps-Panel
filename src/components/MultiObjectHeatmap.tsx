import { useEffect, useMemo, useRef } from 'react'

import { ColorScaleBar } from './ColorScaleBar'
import { PillMultiToggle } from './PillMultiToggle'
import { PillToggle } from './PillToggle'
import { renderHeatmap, computeMaxDensity } from '../lib/heatmapRenderer'
import { getTeamDisplayName } from '../lib/teamName'
import type {
  DashboardObjectResponse,
  PerspectiveFilter,
  PhaseFilter,
  SideFilter,
  SubjectFilter,
  TimeRangeInfo,
} from '../types'
import styles from './MultiObjectHeatmap.module.css'

type HeatmapPalette = {
  line: string
  fill: string
}

type MultiObjectHeatmapProps = {
  mapName: string
  objects: DashboardObjectResponse[]
  perspective: PerspectiveFilter
  selectedSides: SideFilter[]
  subject: SubjectFilter
  phase: PhaseFilter
  visibleObjectIds: string[]
  paletteByObjectId: Record<string, HeatmapPalette>
  site: 'A' | 'B' | 'C' | undefined
  timeRange: TimeRangeInfo | null
  timeRangeMin?: number
  timeRangeMax?: number
  onPerspectiveChange: (perspective: PerspectiveFilter) => void
  onSidesChange: (sides: SideFilter[]) => void
  onSubjectChange: (subject: SubjectFilter) => void
  onSiteChange: (site: 'A' | 'B' | 'C' | undefined) => void
  onTimeRangeChange: (min: number, max: number) => void
  onToggleObject: (objectId: string) => void
}

const TIME_STEP = 0.5
const MAP_ASSET_ROOT = `${import.meta.env.BASE_URL}maps`
const RELATION_VIEWBOX_SIZE = 1000
const RELATION_MARKER_RADIUS = 6
const RELATION_CROSS_HALF = 8
const RELATION_BLUE = '#38bdf8'
const RELATION_RED = '#ef4444'

function fmtSec(sec: number, phase: PhaseFilter): string {
  const rounded = Math.round(sec * 10) / 10
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  if (phase === 'pre_plant') return `${value}s Before Plant`
  if (phase === 'post_plant') return `${value}s After Plant`
  return `${value}s`
}

function isNear(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.05
}

export function MultiObjectHeatmap({
  mapName,
  objects,
  perspective,
  selectedSides,
  subject,
  phase,
  visibleObjectIds,
  paletteByObjectId,
  site,
  timeRange,
  timeRangeMin,
  timeRangeMax,
  onPerspectiveChange,
  onSidesChange,
  onSubjectChange,
  onSiteChange,
  onTimeRangeChange,
  onToggleObject,
}: MultiObjectHeatmapProps) {
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const isRelationMode = perspective === 'all_kills'

  const renderedObjects = useMemo(
    () => objects.filter((item) => visibleObjectIds.includes(item.id)),
    [objects, visibleObjectIds],
  )

  const renderedLayers = useMemo(
    () =>
      renderedObjects.map((item) => {
        const points = site ? item.heatmap.points.filter((point) => point.site === site) : item.heatmap.points
        const sourceLinks = item.heatmap.links ?? []
        const links = site ? sourceLinks.filter((link) => link.site === site) : sourceLinks
        return {
          item,
          points,
          links,
          displayCount: isRelationMode ? links.length : points.length,
        }
      }),
    [isRelationMode, renderedObjects, site],
  )

  const totalPoints = renderedLayers.reduce((sum, layer) => sum + layer.displayCount, 0)
  const anyVisible = renderedLayers.length > 0
  const hasAnyPoints = renderedLayers.some((layer) => layer.displayCount > 0)

  const sliderValueMin = useMemo(() => {
    if (!timeRange) return 0
    const fallback = timeRange.availableMin
    const requested = timeRangeMin ?? fallback
    return Math.min(Math.max(requested, timeRange.availableMin), timeRange.availableMax)
  }, [timeRange, timeRangeMin])

  const sliderValueMax = useMemo(() => {
    if (!timeRange) return 0
    const fallback = timeRange.availableMax
    const requested = timeRangeMax ?? fallback
    return Math.min(Math.max(requested, timeRange.availableMin), timeRange.availableMax)
  }, [timeRange, timeRangeMax])

  const normalizedSliderMin = Math.min(sliderValueMin, sliderValueMax)
  const normalizedSliderMax = Math.max(sliderValueMin, sliderValueMax)
  const sliderSpan = timeRange ? timeRange.availableMax - timeRange.availableMin || 1 : 1
  const sliderLeftPct = timeRange
    ? ((normalizedSliderMin - timeRange.availableMin) / sliderSpan) * 100
    : 0
  const sliderRightPct = timeRange
    ? ((timeRange.availableMax - normalizedSliderMax) / sliderSpan) * 100
    : 0
  const isTimeFiltered = Boolean(
    timeRange &&
      (!isNear(normalizedSliderMin, timeRange.availableMin) ||
        !isNear(normalizedSliderMax, timeRange.availableMax)),
  )

  useEffect(() => {
    if (isRelationMode) {
      return
    }

    const observers: ResizeObserver[] = []

    const drawAll = () => {
      const densities: number[] = []
      for (const layer of renderedLayers) {
        const stage = stageRefs.current[layer.item.id]
        if (!stage) continue
        const rect = stage.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) continue
        densities.push(computeMaxDensity(rect.width, rect.height, layer.points))
      }
      const globalMaxDensity = Math.max(...densities, 1)

      for (const layer of renderedLayers) {
        const stage = stageRefs.current[layer.item.id]
        const canvas = canvasRefs.current[layer.item.id]
        if (!stage || !canvas) continue

        const rect = stage.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) continue

        canvas.width = rect.width
        canvas.height = rect.height

        renderHeatmap({
          canvas,
          points: layer.points,
          scale: 'hot',
          opacity: 0.88,
          maxDensity: globalMaxDensity,
        })
      }
    }

    drawAll()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    for (const layer of renderedLayers) {
      const stage = stageRefs.current[layer.item.id]
      if (!stage) continue
      const observer = new ResizeObserver(() => drawAll())
      observer.observe(stage)
      observers.push(observer)
    }

    return () => {
      for (const observer of observers) observer.disconnect()
    }
  }, [isRelationMode, renderedLayers])

  return (
    <section className={`${styles.root} panel`}>
      <div className="panel-header">
        <div>
          <h2>{isRelationMode ? 'Kill relation map' : 'Heatmap'}</h2>
        </div>
        <div className={styles.metricPairInline}>
          <span>{isRelationMode ? 'Visible kill events' : 'Visible kill points'}</span>
          <strong>{totalPoints}</strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.controlsRow}>
          <div className={styles.toolbarGroup}>
            <span className={styles.label}>Show</span>
            <PillToggle
              options={[
                { value: 'team_kills', label: 'Kills' },
                { value: 'team_deaths', label: 'Deaths' },
                { value: 'all_kills', label: 'All' },
              ]}
              value={perspective}
              onChange={(value) => value && onPerspectiveChange(value)}
            />
          </div>
          <div className={styles.toolbarGroup}>
            <span className={styles.label}>Location</span>
            <PillToggle
              options={[
                { value: 'killer', label: 'Killer' },
                { value: 'victim', label: 'Victim' },
              ]}
              value={subject}
              onChange={(value) => value && onSubjectChange(value)}
              disabled={isRelationMode}
            />
          </div>
          <div className={styles.toolbarGroup}>
            <span className={styles.label}>Site</span>
            <PillToggle
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
              ]}
              value={site}
              onChange={(value) => onSiteChange(value)}
              allowDeselect
            />
          </div>
        </div>

        <div className={styles.analysisRow}>
          <div className={styles.toolbarGroup}>
            <span className={styles.label}>Side</span>
            <PillMultiToggle
              options={[
                { value: 'atk', label: 'ATK' },
                { value: 'def', label: 'DEF' },
              ]}
              values={selectedSides}
              onChange={onSidesChange}
            />
          </div>

          <div className={styles.teamPickerWrap}>
            <span className={styles.label}>Visible teams</span>
            <div className={styles.teamPicker}>
              <div className={styles.legend}>
                {objects.map((item) => {
                  const palette = paletteByObjectId[item.id]
                  const isVisible = visibleObjectIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        styles.legendItem,
                        isVisible ? styles.legendItemActive : '',
                        !isVisible ? styles.legendItemHidden : '',
                      ].join(' ')}
                      onClick={() => onToggleObject(item.id)}
                    >
                      <span className={styles.legendSwatch} style={{ background: palette?.line }} />
                      <span>{getTeamDisplayName(item.team.name, item.team.slug)}</span>
                      <span className={styles.legendBadge}>
                        {(() => {
                          if (!isRelationMode) {
                            return site
                              ? item.heatmap.points.filter((point) => point.site === site).length
                              : item.heatmap.pointCount
                          }
                          const sourceLinks = item.heatmap.links ?? []
                          return site ? sourceLinks.filter((link) => link.site === site).length : sourceLinks.length
                        })()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {timeRange ? (
          <div className={styles.timeRangeSection}>
            <div className={styles.timeRangeHeader}>
              <span className={styles.label}>Time range</span>
              <span className={styles.timeRangeValue}>
                {fmtSec(normalizedSliderMin, phase)}
                <span className={styles.timeRangeDash}> - </span>
                {fmtSec(normalizedSliderMax, phase)}
              </span>
              {isTimeFiltered ? (
                <button
                  type="button"
                  className={styles.timeRangeReset}
                  onClick={() => onTimeRangeChange(timeRange.availableMin, timeRange.availableMax)}
                >
                  Reset
                </button>
              ) : null}
            </div>

            <div className={styles.timeRangeWrap}>
              <div className={styles.timeRangeTrack}>
                <div
                  className={styles.timeRangeFill}
                  style={{ left: `${sliderLeftPct}%`, right: `${sliderRightPct}%` }}
                />
              </div>
              <input
                type="range"
                className={`${styles.timeRangeInput} ${styles.timeRangeMin}`}
                aria-label="Time range start"
                min={timeRange.availableMin}
                max={timeRange.availableMax}
                step={TIME_STEP}
                value={normalizedSliderMin}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  const minBound = timeRange.availableMin
                  const upperBound = Math.max(normalizedSliderMax - TIME_STEP, minBound)
                  onTimeRangeChange(Math.min(next, upperBound), normalizedSliderMax)
                }}
              />
              <input
                type="range"
                className={`${styles.timeRangeInput} ${styles.timeRangeMax}`}
                aria-label="Time range end"
                min={timeRange.availableMin}
                max={timeRange.availableMax}
                step={TIME_STEP}
                value={normalizedSliderMax}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  const maxBound = timeRange.availableMax
                  const lowerBound = Math.min(normalizedSliderMin + TIME_STEP, maxBound)
                  onTimeRangeChange(normalizedSliderMin, Math.max(next, lowerBound))
                }}
              />
            </div>

            <div className={styles.timeRangeTicks}>
              <span>{fmtSec(timeRange.availableMin, phase)}</span>
              <span>{fmtSec(timeRange.availableMax, phase)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {!objects.length ? (
        <div className="empty-card" style={{ margin: 24 }}>
          Add a comparison object first, then view the map heatmap.
        </div>
      ) : !anyVisible ? (
        <div className="empty-card" style={{ margin: 24 }}>
          Keep at least one comparison object visible to display the heatmap.
        </div>
      ) : !hasAnyPoints ? (
        <div className="empty-card" style={{ margin: 24 }}>
          {isRelationMode
            ? 'The visible objects have no drawable kill relations under the active filters.'
            : 'The visible objects have no drawable kill points under the active filters.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {renderedLayers.map((layer) => (
            <article key={layer.item.id} className={styles.card}>
              <header className={styles.cardHeader}>
                <h3>{getTeamDisplayName(layer.item.team.name, layer.item.team.slug)}</h3>
                <span>{layer.displayCount} {isRelationMode ? 'evts' : 'pts'}</span>
              </header>
              <div
                ref={(node) => {
                  stageRefs.current[layer.item.id] = node
                }}
                className={styles.stage}
              >
                <img
                  src={`${MAP_ASSET_ROOT}/${mapName}.png`}
                  alt={`${mapName} tactical map`}
                  className={styles.mapImg}
                  draggable={false}
                />
                {isRelationMode ? (
                  <svg
                    className={styles.relationLayer}
                    viewBox={`0 0 ${RELATION_VIEWBOX_SIZE} ${RELATION_VIEWBOX_SIZE}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {layer.links.map((link, index) => {
                      const killerX = link.killerX * RELATION_VIEWBOX_SIZE
                      const killerY = link.killerY * RELATION_VIEWBOX_SIZE
                      const victimX = link.victimX * RELATION_VIEWBOX_SIZE
                      const victimY = link.victimY * RELATION_VIEWBOX_SIZE
                      const killerColor = link.relation === 'team_kill' ? RELATION_BLUE : RELATION_RED
                      const victimColor = link.relation === 'team_kill' ? RELATION_RED : RELATION_BLUE
                      return (
                        <g key={`${layer.item.id}-${link.roundNumber}-${link.timeBucket ?? 'na'}-${index}`}>
                          <line
                            className={styles.relationLine}
                            x1={killerX}
                            y1={killerY}
                            x2={victimX}
                            y2={victimY}
                            data-relation-line="true"
                          />
                          <circle
                            className={styles.relationCircle}
                            cx={killerX}
                            cy={killerY}
                            r={RELATION_MARKER_RADIUS}
                            fill={killerColor}
                          />
                          <line
                            className={styles.relationCross}
                            x1={victimX - RELATION_CROSS_HALF}
                            y1={victimY - RELATION_CROSS_HALF}
                            x2={victimX + RELATION_CROSS_HALF}
                            y2={victimY + RELATION_CROSS_HALF}
                            stroke={victimColor}
                          />
                          <line
                            className={styles.relationCross}
                            x1={victimX + RELATION_CROSS_HALF}
                            y1={victimY - RELATION_CROSS_HALF}
                            x2={victimX - RELATION_CROSS_HALF}
                            y2={victimY + RELATION_CROSS_HALF}
                            stroke={victimColor}
                          />
                        </g>
                      )
                    })}
                  </svg>
                ) : (
                  <canvas
                    ref={(node) => {
                      canvasRefs.current[layer.item.id] = node
                    }}
                    className={styles.canvas}
                    aria-hidden="true"
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!isRelationMode ? (
        <div className={styles.scaleWrap}>
          <ColorScaleBar scale="hot" ticks={[0, 1, 2, 3, '4+']} label="Unified density scale" />
        </div>
      ) : null}
    </section>
  )
}
