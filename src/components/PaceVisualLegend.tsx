import { PACE_LINE_LEGEND_ITEMS, PACE_PLANT_LEGEND_ITEMS } from './paceVisuals'
import styles from './PaceVisualLegend.module.css'

type PaceVisualLegendProps = {
  className?: string
}

export function PaceVisualLegend({ className }: PaceVisualLegendProps) {
  return (
    <div className={`${styles.root} ${className ?? ''}`} aria-label="节奏图图例">
      <div className={styles.group}>
        {PACE_PLANT_LEGEND_ITEMS.map((item) => (
          <div key={item.site} className={styles.item}>
            <span
              className={`${styles.patternSwatch} ${
                item.site === 'A'
                  ? styles.siteA
                  : item.site === 'B'
                    ? styles.siteB
                    : styles.siteC
              }`}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.group}>
        {PACE_LINE_LEGEND_ITEMS.map((item) => (
          <div key={item.key} className={styles.item}>
            <span
              className={`${styles.lineSample} ${
                item.key === 'kills' ? styles.lineSolid : styles.lineDashed
              }`}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
