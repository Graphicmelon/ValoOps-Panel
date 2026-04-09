export type PacePlantSite = 'A' | 'B' | 'C'

export type PacePlantPatternItem = {
  site: PacePlantSite
  label: string
}

type PaceLineLegendItem = {
  key: 'kills' | 'deaths'
  label: string
}

export const PACE_PLANT_BAR_COLOR = '#7dd3fc'
export const PACE_UNKNOWN_BAR_COLOR = '#94a3b8'

export const PACE_PLANT_PATTERN_ITEMS: PacePlantPatternItem[] = [
  { site: 'A', label: 'A Site' },
  { site: 'B', label: 'B Site' },
  { site: 'C', label: 'C Site' },
]

export const PACE_LINE_LEGEND_ITEMS: PaceLineLegendItem[] = [
  { key: 'kills', label: 'Kills' },
  { key: 'deaths', label: 'Deaths' },
]

function createPacePlantDecal(site: PacePlantSite) {
  if (site === 'A') {
    return {
      symbol: 'rect' as const,
      symbolSize: 1.6,
      dashArrayX: [1, 0],
      dashArrayY: [5, 4],
      rotation: -Math.PI / 4,
      color: 'rgba(15, 23, 42, 0.5)',
    }
  }
  if (site === 'B') {
    return {
      symbol: 'rect' as const,
      symbolSize: 1.1,
      dashArrayX: [9, 5],
      dashArrayY: [3, 4],
      color: 'rgba(15, 23, 42, 0.52)',
    }
  }
  return {
    symbol: 'rect' as const,
    symbolSize: 1,
    dashArrayX: [4, 3],
    dashArrayY: [4, 3],
    rotation: Math.PI / 4,
    color: 'rgba(15, 23, 42, 0.42)',
  }
}

export function getPacePlantItemStyle(site: PacePlantSite, color: string) {
  return {
    color,
    decal: createPacePlantDecal(site),
  }
}
