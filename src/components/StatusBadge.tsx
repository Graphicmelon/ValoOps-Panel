import { clsx } from 'clsx'
import styles from './StatusBadge.module.css'

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

type StatusBadgeProps = {
  label: string
  variant: StatusBadgeVariant
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return <span className={clsx(styles.badge, styles[variant])}>{label}</span>
}
