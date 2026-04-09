import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { MultiObjectPaceChart } from './MultiObjectPaceChart'
import type { DashboardObjectResponse } from '../types'

const setOptionMock = vi.fn()
const onMock = vi.fn()
const offMock = vi.fn()
const resizeMock = vi.fn()
const disposeMock = vi.fn()

vi.mock('echarts', () => ({
  init: () => ({
    setOption: (...args: unknown[]) => setOptionMock(...args),
    on: (...args: unknown[]) => onMock(...args),
    off: (...args: unknown[]) => offMock(...args),
    resize: (...args: unknown[]) => resizeMock(...args),
    dispose: (...args: unknown[]) => disposeMock(...args),
  }),
}))

function buildBuckets() {
  return Array.from({ length: 10 }).map((_, index) => ({
    index,
    label: index === 0 ? '0-10s' : `${index * 10 + 1}-${(index + 1) * 10}s`,
    teamKills: index === 1 ? 2 : 0,
    teamDeaths: index === 2 ? 1 : 0,
    teamPlants: index === 3 ? 1 : 0,
    opponentPlants: 0,
    teamPlantsA: index === 3 ? 1 : 0,
    teamPlantsB: 0,
    teamPlantsC: 0,
    effectiveRounds: 20,
    killsPer100Rounds: index === 1 ? 10 : 0,
    deathsPer100Rounds: index === 2 ? 5 : 0,
    plantsPer100Rounds: index === 3 ? 5 : 0,
  }))
}

function buildDashboardObject(id: string, slug: string, name: string): DashboardObjectResponse {
  return {
    id,
    team: {
      slug,
      name,
      mapCount: 1,
      matchCount: 1,
      lastUpdatedAt: '2026-03-08T00:00:00Z',
    },
    effectiveFilters: {
      phase: 'all',
      perspective: 'team_kills',
      subject: 'killer',
      include_post_round: true,
      include_ability: true,
      tournamentIds: [],
      opponents: [],
      matchIds: [],
      emptyReason: null,
    },
    heatmap: {
      selectedFilters: {
        phase: 'all',
        perspective: 'team_kills',
        subject: 'killer',
        include_post_round: true,
        include_ability: true,
        tournamentIds: [],
        opponents: [],
        matchIds: [],
        emptyReason: null,
      },
      mapName: 'Pearl',
      pointCount: 0,
      sampleCount: 0,
      lowConfidence: false,
      emptyReason: null,
      timeRange: null,
      points: [],
      links: [],
    },
    pace: {
      selectedFilters: {
        phase: 'all',
        perspective: 'team_kills',
        subject: 'killer',
        include_post_round: true,
        include_ability: true,
        tournamentIds: [],
        opponents: [],
        matchIds: [],
        emptyReason: null,
      },
      lowConfidence: false,
      emptyReason: null,
      buckets: buildBuckets(),
    },
  }
}

function latestOption() {
  const option = [...setOptionMock.mock.calls]
    .map((call) => call[0] as { xAxis?: { data?: unknown } })
    .reverse()
    .find((current) => {
      const data = current?.xAxis?.data
      return Array.isArray(data) && data.length === 10
    })

  if (!option) {
    throw new Error('Expected a main pace chart option to be set.')
  }

  return option as {
    yAxis?: { name?: string; max?: number } | Array<{ name?: string; max?: number }>
    series?: Array<{
      name?: string
      yAxisIndex?: number
      itemStyle?: { decal?: unknown }
      data?: Array<{ itemStyle?: { decal?: unknown } }>
    }>
  }
}

beforeEach(() => {
  setOptionMock.mockClear()
  onMock.mockClear()
  offMock.mockClear()
  resizeMock.mockClear()
  disposeMock.mockClear()
})

it('switches metric mode between count and rate in multi-object pace chart', async () => {
  render(
    <MultiObjectPaceChart
      objects={[buildDashboardObject('obj-edg', 'edward-gaming', 'EDward Gaming')]}
      paletteByObjectId={{
        'obj-edg': {
          line: '#22d3ee',
          fill: 'rgba(34, 211, 238, 0.18)',
          siteA: '#67e8f9',
          siteB: '#22d3ee',
          siteC: '#0ea5e9',
        },
      }}
    />,
  )

  expect(screen.getByText('Visible teams')).toBeInTheDocument()

  await waitFor(() => {
    expect(setOptionMock).toHaveBeenCalled()
  })

  const countAxis = latestOption().yAxis
  expect(Array.isArray(countAxis)).toBe(true)
  if (!Array.isArray(countAxis)) throw new Error('Expected dual yAxis in count mode')
  expect(countAxis[0]?.name).toBe('Plants')
  expect(countAxis[1]?.name).toBe('Kills / Deaths')

  fireEvent.click(screen.getByRole('button', { name: 'Rate' }))

  await waitFor(() => {
    const yAxis = latestOption().yAxis
    expect(Array.isArray(yAxis)).toBe(false)
    expect((yAxis as { name?: string })?.name).toBe('Rate')
  })
})

it('builds combined series and supports independent visibility toggles', async () => {
  render(
    <MultiObjectPaceChart
      objects={[
        buildDashboardObject('obj-edg', 'edward-gaming', 'EDward Gaming'),
        buildDashboardObject('obj-t1', 't1', 'T1'),
      ]}
      paletteByObjectId={{
        'obj-edg': {
          line: '#22d3ee',
          fill: 'rgba(34, 211, 238, 0.18)',
          siteA: '#67e8f9',
          siteB: '#22d3ee',
          siteC: '#0ea5e9',
        },
        'obj-t1': {
          line: '#fb7185',
          fill: 'rgba(251, 113, 133, 0.2)',
          siteA: '#fda4af',
          siteB: '#fb7185',
          siteC: '#e11d48',
        },
      }}
    />,
  )

  await waitFor(() => {
    expect(setOptionMock).toHaveBeenCalled()
  })

  const initialSeriesNames = (latestOption().series ?? [])
    .map((series) => series.name ?? '')
    .join('|')
  expect(initialSeriesNames).toContain('EDG Kills')
  expect(initialSeriesNames).toContain('T1 Kills')
  expect(initialSeriesNames).toContain('EDG A site plants')

  const edgPlantSeries = (latestOption().series ?? []).find(
    (series) => series.name === 'EDG A site plants',
  )
  expect(edgPlantSeries?.itemStyle?.decal).toBeTruthy()
  expect(edgPlantSeries?.yAxisIndex).toBe(0)

  const countAxis = latestOption().yAxis
  expect(Array.isArray(countAxis)).toBe(true)
  if (!Array.isArray(countAxis)) throw new Error('Expected dual yAxis in count mode')
  expect(screen.getByText('A Site')).toBeInTheDocument()
  expect(screen.getByText('B Site')).toBeInTheDocument()
  expect(screen.getByText('C Site')).toBeInTheDocument()
  expect(screen.getByText('Kills')).toBeInTheDocument()
  expect(screen.getByText('Deaths')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'T1' }))

  await waitFor(() => {
    const seriesNames = (latestOption().series ?? []).map((series) => series.name ?? '').join('|')
    expect(seriesNames).not.toContain('T1 Kills')
  })
})
