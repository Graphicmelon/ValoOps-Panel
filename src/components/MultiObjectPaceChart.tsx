import { useEffect, useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'

import { EChart } from './EChart'
import { PaceVisualLegend } from './PaceVisualLegend'
import { PillToggle } from './PillToggle'
import { getPacePlantItemStyle, PACE_UNKNOWN_BAR_COLOR } from './paceVisuals'
import { getTeamDisplayName } from '../lib/teamName'
import type { DashboardObjectResponse } from '../types'
import styles from './MultiObjectPaceChart.module.css'

type PacePalette = {
  line: string
  fill: string
  siteA: string
  siteB: string
  siteC: string
}

type MultiObjectPaceChartProps = {
  objects: DashboardObjectResponse[]
  paletteByObjectId: Record<string, PacePalette>
}

type MetricMode = 'count' | 'rate'

type ObjectBucketStats = {
  killsCount: number
  deathsCount: number
  plantsACount: number
  plantsBCount: number
  plantsCCount: number
  plantsUnknownCount: number
  plantsTotalCount: number
  killsRate: number
  deathsRate: number
  plantsARate: number
  plantsBRate: number
  plantsCRate: number
  plantsUnknownRate: number
  plantsTotalRate: number
}

type ChartRow = {
  index: number
  label: string
  byObjectId: Record<string, ObjectBucketStats>
}

function r2(value: number): number {
  return Math.round(value * 100) / 100
}

function formatByMode(value: number, mode: MetricMode): string {
  if (mode === 'count') return String(value)
  return `${Math.round(value)}%`
}

export function MultiObjectPaceChart({ objects, paletteByObjectId }: MultiObjectPaceChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('count')
  const [visibleObjectIds, setVisibleObjectIds] = useState<string[]>([])

  const chartRows = useMemo<ChartRow[]>(() => {
    const totalsByObject = Object.fromEntries(
      objects.map((item) => {
        const totals = item.pace.buckets.reduce(
          (acc, bucket) => ({
            kills: acc.kills + bucket.teamKills,
            deaths: acc.deaths + bucket.teamDeaths,
            plants: acc.plants + bucket.teamPlants,
          }),
          { kills: 0, deaths: 0, plants: 0 },
        )
        return [item.id, totals]
      }),
    )

    const maxBucketCount = objects.reduce((max, item) => Math.max(max, item.pace.buckets.length), 0)
    return Array.from({ length: maxBucketCount }).map((_, index) => {
      const byObjectId: Record<string, ObjectBucketStats> = {}
      for (const item of objects) {
        const bucket = item.pace.buckets[index]
        const teamPlants = bucket?.teamPlants ?? 0
        const plantsA = bucket?.teamPlantsA ?? 0
        const plantsB = bucket?.teamPlantsB ?? 0
        const plantsC = bucket?.teamPlantsC ?? 0
        const plantsUnknown = Math.max(teamPlants - (plantsA + plantsB + plantsC), 0)
        const totals = totalsByObject[item.id] ?? { kills: 0, deaths: 0, plants: 0 }

        byObjectId[item.id] = {
          killsCount: bucket?.teamKills ?? 0,
          deathsCount: bucket?.teamDeaths ?? 0,
          plantsACount: plantsA,
          plantsBCount: plantsB,
          plantsCCount: plantsC,
          plantsUnknownCount: plantsUnknown,
          plantsTotalCount: teamPlants,
          killsRate: totals.kills > 0 ? r2(((bucket?.teamKills ?? 0) * 100) / totals.kills) : 0,
          deathsRate: totals.deaths > 0 ? r2(((bucket?.teamDeaths ?? 0) * 100) / totals.deaths) : 0,
          plantsARate: totals.plants > 0 ? r2((plantsA * 100) / totals.plants) : 0,
          plantsBRate: totals.plants > 0 ? r2((plantsB * 100) / totals.plants) : 0,
          plantsCRate: totals.plants > 0 ? r2((plantsC * 100) / totals.plants) : 0,
          plantsUnknownRate: totals.plants > 0 ? r2((plantsUnknown * 100) / totals.plants) : 0,
          plantsTotalRate: totals.plants > 0 ? r2((teamPlants * 100) / totals.plants) : 0,
        }
      }

      return {
        index,
        label: objects[0]?.pace.buckets[index]?.label ?? '',
        byObjectId,
      }
    })
  }, [objects])

  useEffect(() => {
    const objectIds = objects.map((item) => item.id)
    setVisibleObjectIds((current) => {
      const next = current.filter((id) => objectIds.includes(id))
      return next.length ? next : objectIds
    })
  }, [objects])

  const visibleObjects = useMemo(
    () => objects.filter((item) => visibleObjectIds.includes(item.id)),
    [objects, visibleObjectIds],
  )
  const hasVisibleObject = visibleObjects.length > 0

  const chartOption = useMemo<EChartsOption>(() => {
    const isCount = metricMode === 'count'
    const categories = chartRows.map((row) => row.label)
    const barMaxWidth = Math.max(10, Math.floor(46 / Math.max(visibleObjects.length, 1)))
    const maxPlantStackCount = chartRows.reduce((max, row) => {
      const rowMax = visibleObjects.reduce((objectMax, item) => {
        const stats = row.byObjectId[item.id]
        if (!stats) return objectMax
        return Math.max(objectMax, stats.plantsTotalCount)
      }, 0)
      return Math.max(max, rowMax)
    }, 0)
    const plantAxisMax = isCount ? Math.max(maxPlantStackCount * 2, 1) : undefined

    const series: EChartsOption['series'] = []

    for (const item of visibleObjects) {
      const palette = paletteByObjectId[item.id]
      const teamName = getTeamDisplayName(item.team.name, item.team.slug)
      if (!palette) continue

      const hasUnknownPlants = chartRows.some(
        (row) => (row.byObjectId[item.id]?.plantsUnknownCount ?? 0) > 0,
      )

      const dataFor = <K extends keyof ObjectBucketStats>(key: K) =>
        chartRows.map((row) => row.byObjectId[item.id]?.[key] ?? 0)
      const plantBarColor = palette.line

      series.push(
        {
          name: `${teamName} A 点下包`,
          type: 'bar',
          yAxisIndex: isCount ? 0 : undefined,
          stack: `plants-${item.id}`,
          barMaxWidth,
          itemStyle: getPacePlantItemStyle('A', plantBarColor),
          data: dataFor(isCount ? 'plantsACount' : 'plantsARate'),
          z: 2,
        },
        {
          name: `${teamName} B 点下包`,
          type: 'bar',
          yAxisIndex: isCount ? 0 : undefined,
          stack: `plants-${item.id}`,
          barMaxWidth,
          itemStyle: getPacePlantItemStyle('B', plantBarColor),
          data: dataFor(isCount ? 'plantsBCount' : 'plantsBRate'),
          z: 2,
        },
        {
          name: `${teamName} C 点下包`,
          type: 'bar',
          yAxisIndex: isCount ? 0 : undefined,
          stack: `plants-${item.id}`,
          barMaxWidth,
          itemStyle: getPacePlantItemStyle('C', plantBarColor),
          data: dataFor(isCount ? 'plantsCCount' : 'plantsCRate'),
          z: 2,
        },
      )

      if (hasUnknownPlants) {
        series.push({
          name: `${teamName} 包点未知`,
          type: 'bar',
          yAxisIndex: isCount ? 0 : undefined,
          stack: `plants-${item.id}`,
          barMaxWidth,
          itemStyle: { color: PACE_UNKNOWN_BAR_COLOR },
          data: dataFor(isCount ? 'plantsUnknownCount' : 'plantsUnknownRate'),
          z: 2,
        })
      }

      series.push(
        {
          name: `${teamName} 击杀`,
          type: 'line',
          yAxisIndex: isCount ? 1 : undefined,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2.4, color: palette.line },
          itemStyle: { color: palette.siteA },
          data: dataFor(isCount ? 'killsCount' : 'killsRate'),
          z: 8,
        },
        {
          name: `${teamName} 死亡`,
          type: 'line',
          yAxisIndex: isCount ? 1 : undefined,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 1.8, color: palette.siteA, type: 'dashed' },
          itemStyle: { color: palette.siteA },
          data: dataFor(isCount ? 'deathsCount' : 'deathsRate'),
          z: 8,
        },
      )
    }

    return {
      animationDuration: 300,
      grid: { top: 42, right: isCount ? 40 : 30, bottom: 38, left: 30 },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(21, 26, 36, 0.96)',
        borderColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        textStyle: { color: '#e6edf3', fontSize: 12 },
        formatter: (payload) => {
          const params = Array.isArray(payload) ? payload : [payload]
          const dataIndex = params[0]?.dataIndex
          if (typeof dataIndex !== 'number') return ''

          const row = chartRows[dataIndex]
          if (!row) return ''

          const lines = [`<div style="margin-bottom:6px;color:#8b949e;">时段: ${row.label}</div>`]
          for (const item of visibleObjects) {
            const stats = row.byObjectId[item.id]
            if (!stats) continue
            const teamName = getTeamDisplayName(item.team.name, item.team.slug)
            const kills = `${stats.killsCount} (${Math.round(stats.killsRate)}%)`
            const deaths = `${stats.deathsCount} (${Math.round(stats.deathsRate)}%)`
            const plants = isCount ? stats.plantsTotalCount : stats.plantsTotalRate
            lines.push(
              `<div style="margin-top:6px;">${teamName} · 击杀 ${kills} · 死亡 ${deaths} · 下包 ${formatByMode(plants, metricMode)}</div>`,
            )
          }
          return lines.join('')
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisTick: { show: false },
        axisLabel: { color: '#8b949e', fontSize: 11 },
      },
      yAxis: isCount
        ? [
            {
              type: 'value',
              name: '下包',
              max: plantAxisMax,
              nameTextStyle: { color: '#8b949e', fontSize: 11, padding: [0, 0, 4, 0] },
              splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
              axisLabel: { color: '#8b949e', fontSize: 11 },
            },
            {
              type: 'value',
              name: '击杀/死亡',
              position: 'right',
              nameTextStyle: { color: '#8b949e', fontSize: 11, padding: [0, 0, 4, 0] },
              splitLine: { show: false },
              axisLabel: { color: '#8b949e', fontSize: 11 },
            },
          ]
        : {
            type: 'value',
            name: '占比',
            nameTextStyle: { color: '#8b949e', fontSize: 11, padding: [0, 0, 4, 0] },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
            axisLabel: { color: '#8b949e', fontSize: 11 },
          },
      series,
    }
  }, [chartRows, metricMode, paletteByObjectId, visibleObjects])

  function toggleObject(objectId: string) {
    setVisibleObjectIds((current) =>
      current.includes(objectId) ? current.filter((id) => id !== objectId) : [...current, objectId],
    )
  }

  return (
    <section className={`${styles.root} panel`}>
      <div className="panel-header">
        <div>
          <h2>节奏图</h2>
        </div>
      </div>

      {!objects.length ? (
        <div className="empty-card" style={{ margin: 24 }}>
          先添加比较对象，再查看节奏对比。
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.metricSwitch}>
              <span className={styles.label}>计数方式</span>
              <PillToggle
                options={[
                  { value: 'count', label: '次数' },
                  { value: 'rate', label: '占比' },
                ]}
                value={metricMode}
                onChange={(mode) => setMetricMode(mode ?? 'count')}
              />
            </div>
            <div className={styles.teamPickerWrap}>
              <span className={styles.label}>展示的队伍</span>
              <div className={styles.teamPicker}>
                <div className={styles.legend}>
                  {objects.map((item) => {
                    const teamName = getTeamDisplayName(item.team.name, item.team.slug)
                    const palette = paletteByObjectId[item.id]
                    const isVisible = visibleObjectIds.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.legendItem} ${isVisible ? styles.legendItemActive : ''}`}
                        onClick={() => toggleObject(item.id)}
                      >
                        <span className={styles.legendSwatch} style={{ background: palette?.line }} />
                        <span>{teamName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {!hasVisibleObject ? (
            <div className="empty-card" style={{ margin: 24 }}>
              至少保留一个对象用于节奏图展示。
            </div>
          ) : (
            <>
              <div className={styles.chartWrap}>
                <EChart option={chartOption} height={420} testId="pace-multi-chart" />
              </div>
              <PaceVisualLegend className={styles.visualLegend} />
            </>
          )}
        </>
      )}

    </section>
  )
}
