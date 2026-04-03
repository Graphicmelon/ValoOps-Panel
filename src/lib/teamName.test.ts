import { describe, expect, it } from 'vitest'

import { getTeamDisplayName } from './teamName'

describe('getTeamDisplayName', () => {
  it('returns AG for All Gamers', () => {
    expect(getTeamDisplayName('All Gamers', 'all-gamers')).toBe('AG')
    expect(getTeamDisplayName('All Gamers')).toBe('AG')
  })

  it('returns DRG for Dragon Ranger Gaming', () => {
    expect(getTeamDisplayName('Dragon Ranger Gaming', 'dragon-ranger-gaming')).toBe('DRG')
    expect(getTeamDisplayName('Dragon Ranger Gaming')).toBe('DRG')
  })

  it('returns EDG for EDward Gaming', () => {
    expect(getTeamDisplayName('EDward Gaming', 'edward-gaming')).toBe('EDG')
    expect(getTeamDisplayName('EDward Gaming')).toBe('EDG')
  })

  it('returns BLG for Bilibili Gaming variants', () => {
    expect(getTeamDisplayName('Bilibili Gaming', 'bilibili-gaming')).toBe('BLG')
    expect(
      getTeamDisplayName(
        'Guangzhou Huadu Bilibili Gaming (Bilibili Gaming)',
        'guangzhou-huadu-bilibili-gaming-bilibili-gaming',
      ),
    ).toBe('BLG')
    expect(getTeamDisplayName('Guangzhou Huadu Bilibili Gaming (Bilibili Gaming)')).toBe('BLG')
  })

  it('returns FPX for FunPlus Phoenix', () => {
    expect(getTeamDisplayName('FunPlus Phoenix', 'funplus-phoenix')).toBe('FPX')
    expect(getTeamDisplayName('FunPlus Phoenix')).toBe('FPX')
  })

  it('returns JDG for JDG Esports variants', () => {
    expect(getTeamDisplayName('JDG Esports', 'jdg-esports')).toBe('JDG')
    expect(
      getTeamDisplayName(
        'JD Mall JDG Esports (JDG Esports)',
        'jd-mall-jdg-esports-jdg-esports',
      ),
    ).toBe('JDG')
    expect(getTeamDisplayName('JD Mall JDG Esports (JDG Esports)')).toBe('JDG')
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

  it('returns TEC for Titan Esports Club variants', () => {
    expect(getTeamDisplayName('Titan Esports Club', 'titan-esports-club')).toBe('TEC')
    expect(
      getTeamDisplayName(
        'Wuxi Titan Esports Club (Titan Esports Club)',
        'wuxi-titan-esports-club-titan-esports-club',
      ),
    ).toBe('TEC')
    expect(getTeamDisplayName('Wuxi Titan Esports Club (Titan Esports Club)')).toBe('TEC')
  })
})
