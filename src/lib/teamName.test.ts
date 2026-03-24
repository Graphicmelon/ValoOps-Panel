import { describe, expect, it } from 'vitest'

import { getTeamDisplayName } from './teamName'

describe('getTeamDisplayName', () => {
  it('returns AG for All Gamers', () => {
    expect(getTeamDisplayName('All Gamers', 'all-gamers')).toBe('AG')
    expect(getTeamDisplayName('All Gamers')).toBe('AG')
  })

  it('returns TE for Trace Esport(s)', () => {
    expect(getTeamDisplayName('Trace Esports', 'trace-esports')).toBe('TE')
    expect(getTeamDisplayName('Trace Esport', 'trace-esport')).toBe('TE')
    expect(getTeamDisplayName('Trace Esports')).toBe('TE')
  })

  it('returns WOL for Wolves Esport(s)', () => {
    expect(getTeamDisplayName('Wolves Esports', 'wolves-esports')).toBe('WOL')
    expect(getTeamDisplayName('Wolves Esport', 'wolves-esport')).toBe('WOL')
    expect(getTeamDisplayName('Wolves Esports')).toBe('WOL')
  })

  it('returns XLG for Xi Lai Gaming', () => {
    expect(getTeamDisplayName('Xi Lai Gaming', 'xi-lai-gaming')).toBe('XLG')
    expect(getTeamDisplayName('Xi Lai Gaming')).toBe('XLG')
  })

  it('returns NOVA for Nova Esport(s)', () => {
    expect(getTeamDisplayName('Nova Esports', 'nova-esports')).toBe('NOVA')
    expect(getTeamDisplayName('Nova Esport', 'nova-esport')).toBe('NOVA')
    expect(getTeamDisplayName('Nova Esports')).toBe('NOVA')
  })

  it('returns TYL for Tyloo', () => {
    expect(getTeamDisplayName('TYLOO', 'tyloo')).toBe('TYL')
    expect(getTeamDisplayName('Tyloo', 'tyloo')).toBe('TYL')
    expect(getTeamDisplayName('Tyloo')).toBe('TYL')
  })
})
