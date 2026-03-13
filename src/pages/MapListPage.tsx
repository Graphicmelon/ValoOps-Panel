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
        <h1>地图对比看板</h1>
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
                <p className="eyebrow">地图</p>
                {map.teamCount >= 2 ? <StatusBadge label="可比较" variant="success" /> : null}
              </div>
              <h2>{map.mapName}</h2>
              <p className={styles.metaLine}>
                {map.sampleCount} 份样本 · {map.teamCount} 支队伍
              </p>
              <div className={styles.cardFooter}>
                <span>最近更新 {new Date(map.lastUpdatedAt).toLocaleDateString('zh-CN')}</span>
                <span className={styles.enterLink}>进入看板 →</span>
              </div>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
