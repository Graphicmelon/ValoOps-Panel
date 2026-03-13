import { getColorScaleCss, type HeatmapScale } from '../lib/colorScales'
import styles from './ColorScaleBar.module.css'

type ColorScaleBarProps = {
  scale: HeatmapScale
  ticks: Array<number | string>
  label?: string
}

export function ColorScaleBar({ scale, ticks, label }: ColorScaleBarProps) {
  return (
    <div className={styles.root}>
      {label ? <div className={styles.label}>{label}</div> : null}
      <div className={styles.gradient} style={{ background: getColorScaleCss(scale) }} />
      <div className={styles.ticks}>
        {ticks.map((tick, idx) => (
          <span key={`${tick}-${idx}`}>{tick}</span>
        ))}
      </div>
    </div>
  )
}
