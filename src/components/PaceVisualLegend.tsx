import { PacePatternSwatch } from './PacePatternSwatch'
import { PACE_LINE_LEGEND_ITEMS, PACE_PLANT_PATTERN_ITEMS } from './paceVisuals'
import styles from './PaceVisualLegend.module.css'

type PaceVisualLegendProps = {
  className?: string
}

export function PaceVisualLegend({ className }: PaceVisualLegendProps) {
  return (
    <div className={`${styles.root} ${className ?? ''}`} aria-label="Pace chart legend">
      <div className={styles.group}>
        {PACE_PLANT_PATTERN_ITEMS.map((item) => (
          <div key={item.site} className={styles.item}>
            <PacePatternSwatch site={item.site} />
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
