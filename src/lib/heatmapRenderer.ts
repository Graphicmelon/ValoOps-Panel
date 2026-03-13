import h337, { type HeatmapInstance } from 'heatmap.js'

import { HEATMAPJS_GRADIENTS, type HeatmapScale } from './colorScales'

type HeatmapPoint = {
  x: number
  y: number
  value?: number
}

type RenderHeatmapOptions = {
  canvas: HTMLCanvasElement
  points: HeatmapPoint[]
  scale: HeatmapScale
  opacity?: number
  maxDensity?: number
}

type RenderHeatmapMeta = {
  maxDensity: number
}

type HeatmapCacheEntry = {
  container: HTMLDivElement
  instance: HeatmapInstance
  width: number
  height: number
}

type PatchedRenderer = {
  canvas?: HTMLCanvasElement
  shadowCtx: CanvasRenderingContext2D
  ctx: CanvasRenderingContext2D
  _renderBoundaries: [number, number, number, number]
  _width: number
  _height: number
  _opacity: number
  _maxOpacity: number
  _minOpacity: number
  _useGradientOpacity: boolean
  _palette: Uint8ClampedArray | number[]
  _colorize?: () => void
  __copilotPatchedColorize?: boolean
}

const HEATMAP_CACHE = new WeakMap<HTMLCanvasElement, HeatmapCacheEntry>()

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getRadius(width: number, height: number) {
  return clamp(Math.round(Math.min(width, height) * 0.028), 16, 38)
}

function getBlur(width: number, height: number) {
  return clamp(Math.min(width, height) / 320, 0.72, 0.9)
}

function getCellSize(radius: number) {
  return Math.max(6, Math.round(radius * 0.55))
}

function patchRendererColorize(instance: HeatmapInstance) {
  const renderer = (instance as HeatmapInstance & { _renderer?: PatchedRenderer })._renderer
  if (!renderer || renderer.__copilotPatchedColorize) {
    return
  }

  renderer._colorize = function patchedColorize() {
    let x = this._renderBoundaries[0]
    let y = this._renderBoundaries[1]
    let width = this._renderBoundaries[2] - x
    let height = this._renderBoundaries[3] - y
    const maxWidth = this._width
    const maxHeight = this._height
    const opacity = this._opacity
    const maxOpacity = this._maxOpacity
    const minOpacity = this._minOpacity
    const useGradientOpacity = this._useGradientOpacity

    if (x < 0) {
      x = 0
    }
    if (y < 0) {
      y = 0
    }
    if (x + width > maxWidth) {
      width = maxWidth - x
    }
    if (y + height > maxHeight) {
      height = maxHeight - y
    }
    if (width <= 0 || height <= 0) {
      this._renderBoundaries = [10000, 10000, 0, 0]
      return
    }

    const image = this.shadowCtx.getImageData(x, y, width, height)
    const imageData = image.data
    const palette = this._palette

    for (let index = 3; index < imageData.length; index += 4) {
      const alpha = imageData[index]
      const offset = alpha * 4

      if (!offset) {
        continue
      }

      let finalAlpha
      if (opacity > 0) {
        finalAlpha = opacity
      } else if (alpha < maxOpacity) {
        finalAlpha = alpha < minOpacity ? minOpacity : alpha
      } else {
        finalAlpha = maxOpacity
      }

      imageData[index - 3] = palette[offset]
      imageData[index - 2] = palette[offset + 1]
      imageData[index - 1] = palette[offset + 2]
      imageData[index] = useGradientOpacity ? palette[offset + 3] : finalAlpha
    }

    this.ctx.putImageData(image, x, y)
    this._renderBoundaries = [10000, 10000, 0, 0]
  }

  renderer.__copilotPatchedColorize = true
}

function ensureContainer(canvas: HTMLCanvasElement, width: number, height: number, scale: HeatmapScale, opacity: number) {
  const cached = HEATMAP_CACHE.get(canvas)
  const radius = getRadius(width, height)
  const blur = getBlur(width, height)

  if (cached && cached.width === width && cached.height === height) {
    cached.instance.configure({
      radius,
      blur,
      maxOpacity: clamp(opacity, 0.2, 0.9),
      minOpacity: 0.03,
      gradient: HEATMAPJS_GRADIENTS[scale],
      backgroundColor: 'transparent',
    })
    return cached
  }

  if (cached) {
    cached.container.remove()
  }

  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.pointerEvents = 'none'
  container.style.opacity = '0'
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  document.body.appendChild(container)

  const instance = h337.create({
    container,
    radius,
    blur,
    maxOpacity: clamp(opacity, 0.2, 0.9),
    minOpacity: 0.03,
    gradient: HEATMAPJS_GRADIENTS[scale],
    backgroundColor: 'transparent',
  })

  patchRendererColorize(instance)

  const entry = { container, instance, width, height }
  HEATMAP_CACHE.set(canvas, entry)
  return entry
}

function aggregatePoints(width: number, height: number, points: HeatmapPoint[]) {
  const radius = getRadius(width, height)
  const cellSize = getCellSize(radius)
  const buckets = new Map<string, { x: number; y: number; value: number }>()

  for (const point of points) {
    const x = clamp(Math.round(point.x * width), 0, Math.max(width - 1, 0))
    const y = clamp(Math.round(point.y * height), 0, Math.max(height - 1, 0))
    const keyX = Math.floor(x / cellSize)
    const keyY = Math.floor(y / cellSize)
    const key = `${keyX}:${keyY}`
    const weight = point.value ?? 1
    const existing = buckets.get(key)

    if (existing) {
      const nextValue = existing.value + weight
      existing.x = Math.round((existing.x * existing.value + x * weight) / nextValue)
      existing.y = Math.round((existing.y * existing.value + y * weight) / nextValue)
      existing.value = nextValue
      continue
    }

    buckets.set(key, { x, y, value: weight })
  }

  const data = [...buckets.values()].map((bucket) => ({
    x: bucket.x,
    y: bucket.y,
    value: Math.max(1, Math.sqrt(bucket.value)),
  }))
  const maxDensity = data.reduce((currentMax, point) => Math.max(currentMax, point.value), 1)

  return { data, maxDensity }
}

function getRendererCanvas(instance: HeatmapInstance) {
  const renderer = (instance as HeatmapInstance & { _renderer?: { canvas?: HTMLCanvasElement } })._renderer
  return renderer?.canvas ?? null
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  context.clearRect(0, 0, canvas.width, canvas.height)
}

export function computeMaxDensity(width: number, height: number, points: HeatmapPoint[]) {
  if (!points.length || width <= 0 || height <= 0) {
    return 1
  }

  return aggregatePoints(width, height, points).maxDensity
}

export function renderHeatmap({ canvas, points, scale, opacity = 0.82, maxDensity }: RenderHeatmapOptions): RenderHeatmapMeta {
  const width = Math.max(0, Math.round(canvas.width))
  const height = Math.max(0, Math.round(canvas.height))

  if (width <= 0 || height <= 0) {
    return { maxDensity: 1 }
  }

  const { instance } = ensureContainer(canvas, width, height, scale, opacity)
  const { data, maxDensity: localMaxDensity } = aggregatePoints(width, height, points)
  const resolvedMaxDensity = Math.max(1, maxDensity ?? localMaxDensity)

  instance.setData({
    min: 0,
    max: resolvedMaxDensity,
    data,
  })

  const sourceCanvas = getRendererCanvas(instance)
  if (!sourceCanvas) {
    clearCanvas(canvas)
    return { maxDensity: resolvedMaxDensity }
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return { maxDensity: resolvedMaxDensity }
  }

  context.clearRect(0, 0, width, height)
  context.drawImage(sourceCanvas, 0, 0, width, height)

  return { maxDensity: resolvedMaxDensity }
}