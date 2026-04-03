import { describe, expect, it } from 'vitest'

import type { DashboardMatchOption } from '../types'
import { compareMatchOptionDesc } from './matchOptions'

function makeMatch(partial: Partial<DashboardMatchOption>): DashboardMatchOption {
  return {
    matchId: 'default-match',
    tournamentId: 'default-tournament',
    tournamentName: 'Default Tournament',
    opponentSlug: 'default-opponent',
    opponentName: 'Default Opponent',
    matchDateCode: '260101',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('compareMatchOptionDesc', () => {
  it('prefers newer updatedAt when one side is missing matchDateCode', () => {
    const matches = [
      makeMatch({
        matchId: 'kickoff',
        matchDateCode: '260203',
        updatedAt: '2026-04-01T08:59:30.092948+00:00',
      }),
      makeMatch({
        matchId: 'stage1',
        tournamentName: 'VCT 2026: China Stage 1',
        matchDateCode: null,
        updatedAt: '2026-04-03T01:38:38.679094+00:00',
      }),
    ]

    expect(matches.sort(compareMatchOptionDesc).map((match) => match.matchId)).toEqual([
      'stage1',
      'kickoff',
    ])
  })

  it('still uses matchDateCode when both sides provide a date', () => {
    const matches = [
      makeMatch({
        matchId: 'older-date',
        matchDateCode: '260207',
        updatedAt: '2026-04-10T00:00:00Z',
      }),
      makeMatch({
        matchId: 'newer-date',
        matchDateCode: '260209',
        updatedAt: '2026-04-01T00:00:00Z',
      }),
    ]

    expect(matches.sort(compareMatchOptionDesc).map((match) => match.matchId)).toEqual([
      'newer-date',
      'older-date',
    ])
  })
})
