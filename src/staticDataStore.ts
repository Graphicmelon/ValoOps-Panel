import {
  STATIC_DATASET_VERSION,
  type StaticDatasetManifest,
  type StaticManifestMap,
  type StaticMapShard,
} from './staticDataset'

const baseUrl = import.meta.env.BASE_URL
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
const DATA_ROOT = `${normalizedBaseUrl}/data`

let manifestPromise: Promise<StaticDatasetManifest> | null = null
const mapShardPromiseByName = new Map<string, Promise<StaticMapShard>>()
let refreshPromise: Promise<boolean> | null = null

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }
  return response.json() as Promise<T>
}

function buildManifestPath(bustCache: boolean): string {
  const path = `${DATA_ROOT}/manifest.json`
  if (!bustCache) {
    return path
  }
  return `${path}?_ts=${Date.now()}`
}

function normalizeMapKey(mapName: string): string {
  return mapName.trim().toLowerCase()
}

function buildShardPath(shardPath: string, manifestGeneratedAt: string): string {
  const versionToken = encodeURIComponent(manifestGeneratedAt)
  return `${DATA_ROOT}/${shardPath}?v=${versionToken}`
}

function validateManifest(manifest: StaticDatasetManifest): StaticDatasetManifest {
  if (manifest.version !== STATIC_DATASET_VERSION) {
    throw new Error(`不支持的数据版本：${manifest.version}`)
  }
  return manifest
}

async function fetchManifest(init?: RequestInit, bustCache = false): Promise<StaticDatasetManifest> {
  const manifest = await fetchJson<StaticDatasetManifest>(buildManifestPath(bustCache), init)
  return validateManifest(manifest)
}

function serializeManifestMap(map: StaticManifestMap): string {
  return [
    normalizeMapKey(map.mapName),
    map.sampleCount,
    map.teamCount,
    map.lastUpdatedAt,
    map.shard,
  ].join('|')
}

function createManifestMapsSignature(manifest: StaticDatasetManifest): string {
  return [...manifest.maps]
    .sort((left, right) => normalizeMapKey(left.mapName).localeCompare(normalizeMapKey(right.mapName)))
    .map((map) => serializeManifestMap(map))
    .join('||')
}

function hasManifestChanged(
  currentManifest: StaticDatasetManifest,
  nextManifest: StaticDatasetManifest,
): boolean {
  if (currentManifest.generatedAt !== nextManifest.generatedAt) {
    return true
  }
  return createManifestMapsSignature(currentManifest) !== createManifestMapsSignature(nextManifest)
}

export async function loadManifest(): Promise<StaticDatasetManifest> {
  if (!manifestPromise) {
    manifestPromise = fetchManifest()
  }

  try {
    return await manifestPromise
  } catch (error) {
    manifestPromise = null
    throw error
  }
}

export async function refreshDatasetIfUpdated(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    if (!manifestPromise) {
      manifestPromise = fetchManifest({ cache: 'no-store' }, true)
      await manifestPromise
      return false
    }

    const currentManifest = await loadManifest()
    const nextManifest = await fetchManifest({ cache: 'no-store' }, true)

    if (!hasManifestChanged(currentManifest, nextManifest)) {
      return false
    }

    manifestPromise = Promise.resolve(nextManifest)
    mapShardPromiseByName.clear()
    return true
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export async function loadMapShardByName(mapName: string): Promise<{
  mapName: string
  shard: StaticMapShard
}> {
  const manifest = await loadManifest()
  const map = manifest.maps.find((item) => normalizeMapKey(item.mapName) === normalizeMapKey(mapName))
  if (!map) {
    throw new Error('Map not found.')
  }

  const cacheKey = normalizeMapKey(map.mapName)
  if (!mapShardPromiseByName.has(cacheKey)) {
    mapShardPromiseByName.set(
      cacheKey,
      fetchJson<StaticMapShard>(buildShardPath(map.shard, manifest.generatedAt))
        .then((shard) => {
          if (shard.version !== STATIC_DATASET_VERSION) {
            throw new Error(`不支持的数据版本：${shard.version}`)
          }
          return shard
        })
        .catch((error) => {
          mapShardPromiseByName.delete(cacheKey)
          throw error
        }),
    )
  }

  const shard = await mapShardPromiseByName.get(cacheKey)
  if (!shard) {
    throw new Error('Map data load failed unexpectedly.')
  }

  return {
    mapName: map.mapName,
    shard,
  }
}
