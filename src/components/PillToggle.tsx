import { clsx } from 'clsx'
import styles from './PillToggle.module.css'

export type PillOption<T extends string> = {
  value: T
  label: string
}

type PillToggleProps<T extends string> = {
  options: readonly PillOption<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
  allowDeselect?: boolean
  disabled?: boolean
}

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = false,
  disabled = false,
}: PillToggleProps<T>) {
  return (
    <div className={clsx(styles.root, disabled && styles.disabled)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={clsx(styles.pill, opt.value === value && styles.active)}
          disabled={disabled}
          onClick={() => {
            if (disabled) {
              return
            }
            if (allowDeselect && opt.value === value) {
              onChange(undefined)
            } else {
              onChange(opt.value)
            }
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
