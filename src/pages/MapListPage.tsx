import { StatusBadge } from '../components/StatusBadge'
import type { MapSummary } from '../types'
import styles from './MapListPage.module.css'

type MapListPageProps = {
  maps: MapSummary[]
  isLoading: boolean
  error: string | null
  onOpenMap: (mapName: string) => void
}

export function MapListPage({ maps, isLoading, error, onOpenMap }: MapListPageProps) {
  return (
    <main className="page-shell">
      <header className={styles.hero}>
        <p className="eyebrow">ValoOps</p>
        <h1>Map Comparison Dashboard</h1>
      </header>

      {error ? <div className="alert-card">{error}</div> : null}

      {isLoading ? (
        <section className="card-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-card" />
          ))}
        </section>
      ) : (
        <section className="card-grid">
          {maps.map((map) => (
            <button
              key={map.mapName}
              type="button"
              className={styles.mapCard}
              onClick={() => onOpenMap(map.mapName)}
            >
              <div className={styles.cardHeader}>
                <p className="eyebrow">Map</p>
                {map.teamCount >= 2 ? <StatusBadge label="Comparable" variant="success" /> : null}
              </div>
              <h2>{map.mapName}</h2>
              <p className={styles.metaLine}>
                {map.sampleCount} samples · {map.teamCount} teams
              </p>
              <div className={styles.cardFooter}>
                <span>Updated {new Date(map.lastUpdatedAt).toLocaleDateString('en-US')}</span>
                <span className={styles.enterLink}>Open dashboard →</span>
              </div>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
