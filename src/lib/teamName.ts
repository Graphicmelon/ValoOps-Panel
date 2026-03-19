const TEAM_SHORT_NAME_BY_SLUG: Record<string, string> = {
  'dragon-ranger': 'DRG',
  'dragon-ranger-gaming': 'DRG',
  'edward-gaming': 'EDG',
  'bilibili-gaming': 'BLG',
  'trace-esport': 'TE',
  'trace-esports': 'TE',
  'wolves-esport': 'WOL',
  'wolves-esports': 'WOL',
  'xi-lai-gaming': 'XLG',
}

const TEAM_SHORT_NAME_BY_NAME_KEY: Record<string, string> = {
  DRAGONRANGER: 'DRG',
  DRAGONRANGERGAMING: 'DRG',
  EDWARDGAMING: 'EDG',
  BILIBILIGAMING: 'BLG',
  TRACEESPORT: 'TE',
  TRACEESPORTS: 'TE',
  WOLVESESPORT: 'WOL',
  WOLVESESPORTS: 'WOL',
  XILAIGAMING: 'XLG',
}

const TEAM_SHORT_NAME_BY_SLUG_PART: Array<[string, string]> = [
  ['dragon-ranger', 'DRG'],
  ['edward-gaming', 'EDG'],
  ['bilibili-gaming', 'BLG'],
  ['trace-esport', 'TE'],
  ['trace-esports', 'TE'],
  ['wolves-esport', 'WOL'],
  ['wolves-esports', 'WOL'],
  ['xi-lai-gaming', 'XLG'],
]

const TEAM_SHORT_NAME_BY_NAME_PART: Array<[string, string]> = [
  ['dragon ranger', 'DRG'],
  ['edward gaming', 'EDG'],
  ['bilibili gaming', 'BLG'],
  ['trace esport', 'TE'],
  ['trace esports', 'TE'],
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
