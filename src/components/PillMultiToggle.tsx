import { clsx } from 'clsx'

import type { PillOption } from './PillToggle'
import styles from './PillToggle.module.css'

type PillMultiToggleProps<T extends string> = {
  options: readonly PillOption<T>[]
  values: readonly T[]
  onChange: (values: T[]) => void
  allowEmpty?: boolean
}

export function PillMultiToggle<T extends string>({
  options,
  values,
  onChange,
  allowEmpty = false,
}: PillMultiToggleProps<T>) {
  const selected = new Set(values)

  function handleToggle(value: T) {
    const next = new Set(selected)
    if (next.has(value)) {
      if (!allowEmpty && next.size === 1) {
        return
      }
      next.delete(value)
    } else {
      next.add(value)
    }
    onChange(options.map((item) => item.value).filter((item) => next.has(item)))
  }

  return (
    <div className={styles.root}>
      {options.map((opt) => {
        const isActive = selected.has(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            className={clsx(styles.pill, isActive && styles.active)}
            aria-pressed={isActive}
            onClick={() => handleToggle(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
