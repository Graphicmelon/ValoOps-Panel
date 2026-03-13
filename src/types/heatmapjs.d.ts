declare module 'heatmap.js' {
  export interface HeatmapDataPoint {
    x: number
    y: number
    value: number
  }

  export interface HeatmapSetData {
    min?: number
    max: number
    data: HeatmapDataPoint[]
  }

  export interface HeatmapConfiguration {
    container: HTMLElement
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    blur?: number
    gradient?: Record<string, string>
    backgroundColor?: string
    xField?: string
    yField?: string
    valueField?: string
    onExtremaChange?: (extrema: { min: number; max: number }) => void
  }

  export interface HeatmapInstance {
    setData(data: HeatmapSetData): HeatmapInstance
    addData(data: HeatmapDataPoint | HeatmapDataPoint[]): HeatmapInstance
    setDataMax(max: number): HeatmapInstance
    configure(config: Partial<Omit<HeatmapConfiguration, 'container'>>): void
    getDataURL(): string
    repaint(): HeatmapInstance
  }

  interface H337 {
    create(config: HeatmapConfiguration): HeatmapInstance
  }

  const h337: H337
  export default h337
}
