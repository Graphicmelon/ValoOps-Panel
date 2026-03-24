import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'

import { EChart } from './EChart'
import { getPacePlantItemStyle, PACE_PLANT_BAR_COLOR, type PacePlantSite } from './paceVisuals'
import styles from './PacePatternSwatch.module.css'

type PacePatternSwatchProps = {
  site: PacePlantSite
}

export function PacePatternSwatch({ site }: PacePatternSwatchProps) {
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
      xAxis: { type: 'category', data: ['swatch'], show: false },
      yAxis: { type: 'value', min: 0, max: 1, show: false },
      tooltip: { show: false },
      series: [
        {
          type: 'bar',
          data: [1],
          barWidth: '100%',
          silent: true,
          itemStyle: getPacePlantItemStyle(site, PACE_PLANT_BAR_COLOR),
        },
      ],
    }),
    [site],
  )

  return (
    <div className={styles.root} aria-hidden="true">
      <EChart
        option={option}
        height={12}
        className={`${styles.chart} ${site === 'B' ? styles.chartOffsetDown : ''}`}
        testId={`pace-pattern-swatch-${site}`}
      />
    </div>
  )
}
