export type PacePlantSite = 'A' | 'B' | 'C'

type PacePlantLegendItem = {
  site: PacePlantSite
  label: string
}

type PaceLineLegendItem = {
  key: 'kills' | 'deaths'
  label: string
}

export const PACE_PLANT_BAR_COLOR = '#7dd3fc'
export const PACE_UNKNOWN_BAR_COLOR = '#94a3b8'

export const PACE_PLANT_LEGEND_ITEMS: PacePlantLegendItem[] = [
  { site: 'A', label: 'A 点下包' },
  { site: 'B', label: 'B 点下包' },
  { site: 'C', label: 'C 点下包' },
]

export const PACE_LINE_LEGEND_ITEMS: PaceLineLegendItem[] = [
  { key: 'kills', label: '击杀（实线）' },
  { key: 'deaths', label: '死亡（虚线）' },
]

function createPacePlantDecal(site: PacePlantSite) {
  if (site === 'A') {
    return {
      symbol: 'rect' as const,
      symbolSize: 1,
      dashArrayX: [1, 0],
      dashArrayY: [4, 3],
      rotation: -Math.PI / 4,
      color: 'rgba(15, 23, 42, 0.42)',
    }
  }
  if (site === 'B') {
    return {
      symbol: 'circle' as const,
      symbolSize: 2,
      dashArrayX: [1, 5],
      dashArrayY: [1, 5],
      color: 'rgba(15, 23, 42, 0.42)',
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
