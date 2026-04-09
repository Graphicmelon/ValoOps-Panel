import { useCallback, useEffect, useRef, useState } from 'react'

import { checkDatasetUpdate, listMaps } from './api'
import { MapDashboardPage } from './pages/MapDashboardPage'
import { MapListPage } from './pages/MapListPage'
import type { MapSummary } from './types'

type Route = { kind: 'maps' } | { kind: 'map'; mapName: string }
const DATA_REFRESH_INTERVAL_MS = 30_000

function normalizePath(pathname: string): string {
  return pathname === '/' ? '/maps' : pathname
}

function normalizeHashPath(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) {
    return null
  }
  const [path] = raw.split('?', 1)
  if (!path) {
    return '/maps'
  }
  return path.startsWith('/') ? path : `/${path}`
}

function parseRoute(pathname: string, search: string, hash: string): Route {
  const path = normalizeHashPath(hash) ?? normalizePath(pathname)
  const match = path.match(/^\/maps\/([^/]+)$/)
  if (match) {
    let mapName = match[1]
    try {
      mapName = decodeURIComponent(match[1])
    } catch {
      mapName = match[1]
    }

    if (!hash && search) {
      window.history.replaceState({}, '', `/maps/${encodeURIComponent(mapName)}`)
    }

    return { kind: 'map', mapName }
  }
  return { kind: 'maps' }
}

function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname, window.location.search, window.location.hash),
  )
  const [maps, setMaps] = useState<MapSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataRevision, setDataRevision] = useState(0)
  const isCheckingDatasetRef = useRef(false)

  const runRefreshCheck = useCallback(async () => {
    if (isCheckingDatasetRef.current) {
      return
    }

    isCheckingDatasetRef.current = true
    try {
      const hasUpdate = await checkDatasetUpdate()
      if (!hasUpdate) {
        return
      }
      setDataRevision((current) => current + 1)
    } catch {
      // Silent refresh check failures should not interrupt the UI.
    } finally {
      isCheckingDatasetRef.current = false
    }
  }, [])

  const syncRouteFromLocation = useCallback(() => {
    setRoute(parseRoute(window.location.pathname, window.location.search, window.location.hash))
  }, [])

  const navigate = useCallback(
    (pathname: string) => {
      const targetHash = `#${pathname}`
      if (window.location.hash === targetHash) {
        syncRouteFromLocation()
        return
      }
      window.location.hash = pathname
    },
    [syncRouteFromLocation],
  )

  useEffect(() => {
    const handleRouteChange = () => {
      syncRouteFromLocation()
    }
    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [syncRouteFromLocation])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void runRefreshCheck()
    }, DATA_REFRESH_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      void runRefreshCheck()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [runRefreshCheck])

  useEffect(() => {
    void runRefreshCheck()
  }, [runRefreshCheck, route])

  useEffect(() => {
    if (route.kind !== 'maps') return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function loadMaps() {
      try {
        const nextMaps = await listMaps()
        if (cancelled) return
        setMaps(nextMaps)
        setIsLoading(false)
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load the map list.')
        setIsLoading(false)
      }
    }

    void loadMaps()
    return () => {
      cancelled = true
    }
  }, [dataRevision, route.kind])

  if (route.kind === 'map') {
    return (
      <MapDashboardPage
        mapName={route.mapName}
        dataRevision={dataRevision}
        onBack={() => navigate('/maps')}
      />
    )
  }

  return (
    <MapListPage
      maps={maps}
      isLoading={isLoading}
      error={error}
      onOpenMap={(mapName) => navigate(`/maps/${encodeURIComponent(mapName)}`)}
    />
  )
}

export default App
