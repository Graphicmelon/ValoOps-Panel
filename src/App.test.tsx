import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import App from './App'

const listMapsMock = vi.fn()
const checkDatasetUpdateMock = vi.fn()
const getMapOptionsMock = vi.fn()
const getTeamMapOptionsMock = vi.fn()
const getMapDashboardMock = vi.fn()
const echartsSetOptionMock = vi.fn()

vi.mock('./api', () => ({
  listMaps: () => listMapsMock(),
  checkDatasetUpdate: () => checkDatasetUpdateMock(),
  getMapOptions: (...args: unknown[]) => getMapOptionsMock(...args),
  getTeamMapOptions: (...args: unknown[]) => getTeamMapOptionsMock(...args),
  getMapDashboard: (...args: unknown[]) => getMapDashboardMock(...args),
}))

vi.mock('echarts', () => ({
  init: () => ({
    setOption: (...args: unknown[]) => echartsSetOptionMock(...args),
    on: () => {},
    off: () => {},
    resize: () => {},
    dispose: () => {},
  }),
}))

type TimeRangePayload = { availableMin: number; availableMax: number } | null

function setupMapApiMocks(timeRange: TimeRangePayload = null) {
  getMapOptionsMock.mockResolvedValue({
    mapName: 'Pearl',
    teams: [
      {
        slug: 'edward-gaming',
        name: 'EDward Gaming',
        sampleCount: 1,
        lastUpdatedAt: '2026-03-08T00:00:00Z',
      },
      { slug: 't1', name: 'T1', sampleCount: 1, lastUpdatedAt: '2026-03-08T00:00:00Z' },
    ],
  })

  getTeamMapOptionsMock.mockImplementation((_mapName: string, teamSlug: string) =>
    Promise.resolve({
      mapName: 'Pearl',
      team: {
        slug: teamSlug,
        name: teamSlug === 't1' ? 'T1' : 'EDward Gaming',
        mapCount: 1,
        matchCount: 1,
        lastUpdatedAt: '2026-03-08T00:00:00Z',
      },
      opponents: [
        {
          slug: teamSlug === 't1' ? 'edward-gaming' : 't1',
          name: teamSlug === 't1' ? 'EDward Gaming' : 'T1',
        },
      ],
      matches: [
        {
          matchId: `${teamSlug}-match-1`,
          tournamentId: 'tournament-1',
          tournamentName: 'VCT 2026: China Kickoff',
          opponentSlug: teamSlug === 't1' ? 'edward-gaming' : 't1',
          opponentName: teamSlug === 't1' ? 'EDward Gaming' : 'T1',
          matchDateCode: '260209',
          updatedAt: '2026-03-08T00:00:00Z',
        },
      ],
    }),
  )

  getMapDashboardMock.mockImplementation((_mapName: string, request: any) =>
    Promise.resolve({
      mapName: 'Pearl',
      globalFilters: request.globalFilters,
      objects: request.objects.map((item: any, index: number) => ({
        id: item.id,
        team: {
          slug: item.teamSlug,
          name: item.teamSlug === 't1' ? 'T1' : 'EDward Gaming',
          mapCount: 1,
          matchCount: 1,
          lastUpdatedAt: '2026-03-08T00:00:00Z',
        },
        effectiveFilters: {
          ...item.filters,
          emptyReason: null,
        },
        heatmap: {
          selectedFilters: {
            ...item.filters,
            emptyReason: null,
          },
          mapName: 'Pearl',
          pointCount: 1,
          sampleCount: 1,
          lowConfidence: false,
          emptyReason: null,
          timeRange,
          points: [
            {
              x: item.teamSlug === 't1' ? 0.7 : 0.4,
              y: item.teamSlug === 't1' ? 0.6 : 0.3,
              roundNumber: index + 1,
              phase: 'pre_plant',
              timeBucket: 1,
              site: item.teamSlug === 't1' ? 'B' : 'A',
              relation: 'team_kill',
            },
          ],
          links: [
            {
              killerX: item.teamSlug === 't1' ? 0.7 : 0.4,
              killerY: item.teamSlug === 't1' ? 0.6 : 0.3,
              victimX: item.teamSlug === 't1' ? 0.66 : 0.5,
              victimY: item.teamSlug === 't1' ? 0.54 : 0.35,
              roundNumber: index + 1,
              phase: 'pre_plant',
              timeBucket: 1,
              site: item.teamSlug === 't1' ? 'B' : 'A',
              relation: 'team_kill',
            },
            {
              killerX: item.teamSlug === 't1' ? 0.58 : 0.62,
              killerY: item.teamSlug === 't1' ? 0.45 : 0.44,
              victimX: item.teamSlug === 't1' ? 0.64 : 0.54,
              victimY: item.teamSlug === 't1' ? 0.41 : 0.5,
              roundNumber: index + 2,
              phase: 'post_plant',
              timeBucket: 6,
              site: item.teamSlug === 't1' ? 'A' : 'B',
              relation: 'team_death',
            },
          ],
        },
        pace: {
          selectedFilters: {
            ...item.filters,
            emptyReason: null,
          },
          lowConfidence: false,
          emptyReason: null,
          buckets: Array.from({ length: 10 }).map((_, bucketIndex) => ({
            index: bucketIndex,
            label: `B${bucketIndex}`,
            teamKills: bucketIndex === 1 ? 2 : 0,
            teamDeaths: 0,
            teamPlants: 0,
            opponentPlants: 0,
            teamPlantsA: 0,
            teamPlantsB: 0,
            teamPlantsC: 0,
            effectiveRounds: 20,
            killsPer100Rounds: 10,
            deathsPer100Rounds: 0,
            plantsPer100Rounds: 0,
          })),
        },
      })),
    }),
  )
}

function latestDashboardRequest() {
  return getMapDashboardMock.mock.calls.at(-1)?.[1] as {
    globalFilters: Record<string, unknown>
    objects: Array<{ teamSlug: string }>
  }
}

async function sleep(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

beforeEach(() => {
  listMapsMock.mockReset()
  checkDatasetUpdateMock.mockReset()
  checkDatasetUpdateMock.mockResolvedValue(false)
  getMapOptionsMock.mockReset()
  getTeamMapOptionsMock.mockReset()
  getMapDashboardMock.mockReset()
  echartsSetOptionMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('renders map list and navigates to map dashboard page', async () => {
  window.history.pushState({}, '', '/maps')
  listMapsMock.mockResolvedValue([
    { mapName: 'Pearl', sampleCount: 2, teamCount: 2, lastUpdatedAt: '2026-03-08T00:00:00Z' },
  ])
  setupMapApiMocks()

  render(<App />)

  await screen.findByText('Pearl')
  fireEvent.click(screen.getByRole('button', { name: /Open dashboard/i }))

  await waitFor(() => {
    expect(window.location.hash).toBe('#/maps/Pearl')
  })

  await screen.findByText(/← Back to dashboard/)
  expect(screen.getByText('Add an object first, then configure filters.')).toBeInTheDocument()
})

it('supports adding and capping compare objects at four', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks()

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  const addButtons = screen.getAllByRole('button', { name: 'Add object' })

  fireEvent.click(addButtons[0])
  fireEvent.click(screen.getByRole('button', { name: 'Add object' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add object' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add object' }))

  expect(screen.getByText(/Object selection · 4 \/ 4/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add object' })).toBeDisabled()
})

it('shows matchDateCode with matchId in source picker second-level items', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks()

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  await screen.findByText('Data source')
  fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0])
  fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0])

  expect(await screen.findByText('260209-edward-gaming-match-1')).toBeInTheDocument()
  expect(screen.queryByText('2026-03-08')).not.toBeInTheDocument()
})

it('auto enters overview compare when multiple teams are selected in heatmap', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks()

  const { container } = render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])

  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  fireEvent.click(screen.getByRole('button', { name: 'Add object' }))
  await waitFor(() => {
    expect(screen.getAllByLabelText('Team')).toHaveLength(2)
  })
  fireEvent.change(screen.getAllByLabelText('Team')[1], { target: { value: 't1' } })

  const edgLegendButton = (await screen.findAllByRole('button', { name: /^EDG/ })).find((btn) =>
    /\d/.test(btn.textContent ?? ''),
  )
  const t1LegendButton = (await screen.findAllByRole('button', { name: /^T1/ })).find((btn) =>
    /\d/.test(btn.textContent ?? ''),
  )
  const pointMetricLabel = await screen.findByText('Visible kill points')

  expect(edgLegendButton).toBeTruthy()
  expect(t1LegendButton).toBeTruthy()

  expect(screen.queryByRole('button', { name: 'Overview' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Single object' })).not.toBeInTheDocument()
  expect(screen.getAllByText('Site')).toHaveLength(1)

  await waitFor(() => {
    expect(container.querySelectorAll('img[alt="Pearl tactical map"]')).toHaveLength(1)
  })

  fireEvent.click(t1LegendButton!)

  await waitFor(() => {
    expect(container.querySelectorAll('img[alt="Pearl tactical map"]')).toHaveLength(2)
  })

  await waitFor(() => {
    expect(pointMetricLabel.nextElementSibling).toHaveTextContent('2')
  })

  fireEvent.click(screen.getByRole('button', { name: 'B' }))

  await waitFor(() => {
    expect(pointMetricLabel.nextElementSibling).toHaveTextContent('1')
    expect(edgLegendButton!).toHaveTextContent('0')
    expect(t1LegendButton!).toHaveTextContent('1')
  })

  fireEvent.click(screen.getByRole('button', { name: 'B' }))

  await waitFor(() => {
    expect(pointMetricLabel.nextElementSibling).toHaveTextContent('2')
    expect(edgLegendButton!).toHaveTextContent('1')
    expect(t1LegendButton!).toHaveTextContent('1')
  })
})

it('switches to relation mode in all-kills perspective and disables subject toggle', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks()

  const { container } = render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  const pointMetricLabel = await screen.findByText('Visible kill points')
  await waitFor(() => {
    expect(pointMetricLabel.nextElementSibling).toHaveTextContent('1')
  })

  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  const relationMetricLabel = await screen.findByText('Visible kill events')

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Killer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Victim' })).toBeDisabled()
    expect(container.querySelectorAll('[data-relation-line="true"]')).toHaveLength(2)
    expect(relationMetricLabel.nextElementSibling).toHaveTextContent('2')
  })

  fireEvent.click(screen.getByRole('button', { name: 'B' }))

  await waitFor(() => {
    expect(container.querySelectorAll('[data-relation-line="true"]')).toHaveLength(1)
    expect(relationMetricLabel.nextElementSibling).toHaveTextContent('1')
  })

  fireEvent.click(screen.getByRole('button', { name: 'Kills' }))

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Killer' })).not.toBeDisabled()
    expect(screen.queryByText('Visible kill events')).not.toBeInTheDocument()
    expect(screen.getByText('Visible kill points')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-relation-line="true"]')).toHaveLength(0)
  })
})

it('throttles heatmap time filter requests while dragging slider', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks({ availableMin: 10, availableMax: 80 })

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  await screen.findByText('Time range')
  const minSlider = screen.getByLabelText('Time range start')

  const initialCalls = getMapDashboardMock.mock.calls.length
  fireEvent.change(minSlider, { target: { value: '20' } })

  await waitFor(() => {
    expect(getMapDashboardMock.mock.calls.length).toBeGreaterThan(initialCalls)
  })
  const callsAfterFirstDrag = getMapDashboardMock.mock.calls.length

  fireEvent.change(minSlider, { target: { value: '28' } })
  expect(getMapDashboardMock.mock.calls.length).toBe(callsAfterFirstDrag)

  await sleep(220)

  await waitFor(() => {
    expect(latestDashboardRequest().globalFilters.heatmap_time_min).toBe(28)
    expect(latestDashboardRequest().globalFilters.heatmap_time_max).toBe(80)
  })
})

it('clears heatmap time filter when reset button is clicked', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks({ availableMin: 10, availableMax: 80 })

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  await screen.findByText('Time range')
  fireEvent.change(screen.getByLabelText('Time range start'), { target: { value: '30' } })

  await sleep(220)
  await screen.findByRole('button', { name: 'Reset' })

  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await sleep(220)

  await waitFor(() => {
    expect(latestDashboardRequest().globalFilters.heatmap_time_min).toBeUndefined()
    expect(latestDashboardRequest().globalFilters.heatmap_time_max).toBeUndefined()
  })
})

it('clears pending time filter updates when phase changes', async () => {
  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks({ availableMin: 10, availableMax: 80 })

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  await screen.findByText('Time range')
  const minSlider = screen.getByLabelText('Time range start')

  fireEvent.change(minSlider, { target: { value: '20' } })
  await waitFor(() => {
    expect(latestDashboardRequest().globalFilters.heatmap_time_min).toBe(20)
  })

  fireEvent.change(minSlider, { target: { value: '32' } })
  fireEvent.click(screen.getByRole('button', { name: 'Planted' }))

  await sleep(220)

  await waitFor(() => {
    expect(latestDashboardRequest().globalFilters.phase).toBe('post_plant')
    expect(latestDashboardRequest().globalFilters.heatmap_time_min).toBeUndefined()
    expect(latestDashboardRequest().globalFilters.heatmap_time_max).toBeUndefined()
  })
})

it('revalidates map list when polling detects dataset update', async () => {
  const intervalHandlers: Array<() => void> = []
  vi.spyOn(window, 'setInterval').mockImplementation(
    ((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        intervalHandlers.push(() => {
          ;(handler as () => void)()
        })
      }
      return intervalHandlers.length as unknown as number
    }) as unknown as typeof window.setInterval,
  )

  window.history.pushState({}, '', '/maps')
  listMapsMock
    .mockResolvedValueOnce([
      { mapName: 'Pearl', sampleCount: 2, teamCount: 2, lastUpdatedAt: '2026-03-08T00:00:00Z' },
    ])
    .mockResolvedValueOnce([
      { mapName: 'Pearl', sampleCount: 3, teamCount: 2, lastUpdatedAt: '2026-03-09T00:00:00Z' },
    ])

  render(<App />)
  await screen.findByText('Pearl')
  expect(listMapsMock).toHaveBeenCalledTimes(1)
  expect(intervalHandlers.length).toBeGreaterThan(0)
  const checkCallsBeforePolling = checkDatasetUpdateMock.mock.calls.length

  checkDatasetUpdateMock.mockResolvedValueOnce(true)
  await act(async () => {
    intervalHandlers.forEach((handler) => handler())
    await Promise.resolve()
  })

  await waitFor(() => {
    expect(checkDatasetUpdateMock.mock.calls.length).toBeGreaterThan(checkCallsBeforePolling)
    expect(listMapsMock).toHaveBeenCalledTimes(2)
  })
})

it('keeps selected objects while refreshing dashboard after dataset update', async () => {
  const intervalHandlers: Array<() => void> = []
  vi.spyOn(window, 'setInterval').mockImplementation(
    ((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        intervalHandlers.push(() => {
          ;(handler as () => void)()
        })
      }
      return intervalHandlers.length as unknown as number
    }) as unknown as typeof window.setInterval,
  )

  window.history.pushState({}, '', '/maps/Pearl')
  setupMapApiMocks()

  render(<App />)

  await screen.findByText('Add an object first, then configure filters.')
  fireEvent.click(screen.getAllByRole('button', { name: 'Add object' })[0])
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'edward-gaming' } })

  await waitFor(() => {
    expect(getMapDashboardMock.mock.calls.length).toBeGreaterThan(0)
  })
  const initialDashboardCalls = getMapDashboardMock.mock.calls.length
  expect(intervalHandlers.length).toBeGreaterThan(0)
  const checkCallsBeforePolling = checkDatasetUpdateMock.mock.calls.length

  checkDatasetUpdateMock.mockResolvedValueOnce(true)
  await act(async () => {
    intervalHandlers.forEach((handler) => handler())
    await Promise.resolve()
  })

  await waitFor(() => {
    expect(checkDatasetUpdateMock.mock.calls.length).toBeGreaterThan(checkCallsBeforePolling)
    expect(getMapDashboardMock.mock.calls.length).toBeGreaterThan(initialDashboardCalls)
    expect(latestDashboardRequest().objects[0]?.teamSlug).toBe('edward-gaming')
  })
})

it('checks dataset immediately when page becomes visible', async () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
  let currentVisibility: DocumentVisibilityState = 'hidden'
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => currentVisibility,
  })

  try {
    window.history.pushState({}, '', '/maps')
    listMapsMock.mockResolvedValue([
      { mapName: 'Pearl', sampleCount: 2, teamCount: 2, lastUpdatedAt: '2026-03-08T00:00:00Z' },
    ])
    render(<App />)
    await screen.findByText('Pearl')
    const checkCallsBeforeVisibilityChange = checkDatasetUpdateMock.mock.calls.length

    checkDatasetUpdateMock.mockResolvedValueOnce(false)
    currentVisibility = 'visible'
    fireEvent(document, new Event('visibilitychange'))

    await waitFor(() => {
      expect(checkDatasetUpdateMock.mock.calls.length).toBeGreaterThan(checkCallsBeforeVisibilityChange)
    })
  } finally {
    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
    } else {
      delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState
    }
  }
})
