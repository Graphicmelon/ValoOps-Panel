const TEAM_SHORT_NAME_BY_SLUG: Record<string, string> = {
  'all-gamers': 'AG',
  'dragon-ranger': 'DRG',
  'dragon-ranger-gaming': 'DRG',
  'edward-gaming': 'EDG',
  'bilibili-gaming': 'BLG',
  'guangzhou-huadu-bilibili-gaming-bilibili-gaming': 'BLG',
  'funplus-phoenix': 'FPX',
  'jdg-esports': 'JDG',
  'jd-mall-jdg-esports-jdg-esports': 'JDG',
  'nova-esport': 'NOVA',
  'nova-esports': 'NOVA',
  'trace-esport': 'TE',
  'trace-esports': 'TE',
  'titan-esports-club': 'TEC',
  tyloo: 'TYL',
  'wolves-esport': 'WOL',
  'wolves-esports': 'WOL',
  'wuxi-titan-esports-club-titan-esports-club': 'TEC',
  'xi-lai-gaming': 'XLG',
}

const TEAM_SHORT_NAME_BY_NAME_KEY: Record<string, string> = {
  ALLGAMERS: 'AG',
  DRAGONRANGER: 'DRG',
  DRAGONRANGERGAMING: 'DRG',
  EDWARDGAMING: 'EDG',
  BILIBILIGAMING: 'BLG',
  GUANGZHOUHUADUBILIBILIGAMINGBILIBILIGAMING: 'BLG',
  FUNPLUSPHOENIX: 'FPX',
  JDGESPORTS: 'JDG',
  JDMALLJDGESPORTSJDGESPORTS: 'JDG',
  NOVAESPORT: 'NOVA',
  NOVAESPORTS: 'NOVA',
  TRACEESPORT: 'TE',
  TRACEESPORTS: 'TE',
  TITANESPORTSCLUB: 'TEC',
  TYLOO: 'TYL',
  WOLVESESPORT: 'WOL',
  WOLVESESPORTS: 'WOL',
  WUXITITANESPORTSCLUBTITANESPORTSCLUB: 'TEC',
  XILAIGAMING: 'XLG',
}

const TEAM_SHORT_NAME_BY_SLUG_PART: Array<[string, string]> = [
  ['all-gamers', 'AG'],
  ['dragon-ranger', 'DRG'],
  ['edward-gaming', 'EDG'],
  ['bilibili-gaming', 'BLG'],
  ['funplus-phoenix', 'FPX'],
  ['jdg-esports', 'JDG'],
  ['nova-esport', 'NOVA'],
  ['nova-esports', 'NOVA'],
  ['trace-esport', 'TE'],
  ['trace-esports', 'TE'],
  ['titan-esports-club', 'TEC'],
  ['tyloo', 'TYL'],
  ['wolves-esport', 'WOL'],
  ['wolves-esports', 'WOL'],
  ['xi-lai-gaming', 'XLG'],
]

const TEAM_SHORT_NAME_BY_NAME_PART: Array<[string, string]> = [
  ['all gamers', 'AG'],
  ['dragon ranger', 'DRG'],
  ['edward gaming', 'EDG'],
  ['bilibili gaming', 'BLG'],
  ['funplus phoenix', 'FPX'],
  ['jdg esports', 'JDG'],
  ['nova esport', 'NOVA'],
  ['nova esports', 'NOVA'],
  ['trace esport', 'TE'],
  ['trace esports', 'TE'],
  ['titan esports club', 'TEC'],
  ['tyloo', 'TYL'],
  ['wolves esport', 'WOL'],
  ['wolves esports', 'WOL'],
  ['xi lai gaming', 'XLG'],
]

function toNameKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function getTeamDisplayName(name?: string, slug?: string): string {
  if (slug && TEAM_SHORT_NAME_BY_SLUG[slug]) {
    return TEAM_SHORT_NAME_BY_SLUG[slug]
  }

  if (slug) {
    const lowered = slug.toLowerCase()
    const matched = TEAM_SHORT_NAME_BY_SLUG_PART.find(([part]) => lowered.includes(part))
    if (matched) {
      return matched[1]
    }
  }

  if (name) {
    const lowered = name.toLowerCase()
    const matched = TEAM_SHORT_NAME_BY_NAME_PART.find(([part]) => lowered.includes(part))
    if (matched) {
      return matched[1]
    }

    const normalized = toNameKey(name)
    if (TEAM_SHORT_NAME_BY_NAME_KEY[normalized]) {
      return TEAM_SHORT_NAME_BY_NAME_KEY[normalized]
    }
    return name
  }

  return slug ?? ''
}
