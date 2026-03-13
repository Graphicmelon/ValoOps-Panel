import { useEffect, useRef } from 'react'

import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export type EChartClickParams = {
  componentType?: string
  seriesType?: string
  seriesName?: string
  dataIndex?: number
}

type EChartProps = {
  option: EChartsOption
  height: number
  className?: string
  testId?: string
  onClick?: (params: EChartClickParams) => void
}

export function EChart({ option, height, className, testId, onClick }: EChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const instance = echarts.init(host)
    chartRef.current = instance

    const resize = () => {
      instance.resize()
    }

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize())
    observer?.observe(host)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      observer?.disconnect()
      instance.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option])

  useEffect(() => {
    const instance = chartRef.current
    if (!instance || !onClick) return

    instance.on('click', onClick as never)
    return () => {
      instance.off('click', onClick as never)
    }
  }, [onClick])

  return <div ref={hostRef} className={className} data-testid={testId} style={{ height }} />
}
