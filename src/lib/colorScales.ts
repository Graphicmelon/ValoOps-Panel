export type HeatmapScale = 'hot' | 'jet' | 'inferno' | 'viridis' | 'cividis'

/**
 * Heatmap.js gradient format: string keys 0–1, CSS color values.
 *
 * Design goals:
 *  - Never oversaturate to pure white
 *  - Transparent at zero density (no ink where there are no events)
 *  - Slow ramp through dark/cool tones so mid-range density is legible
 *  - Reserve bright saturated colors for genuinely high-density zones
 */
export const HEATMAPJS_GRADIENTS: Record<HeatmapScale, Record<string, string>> = {
  hot: {
    '0':    'transparent',
    '0.12': 'rgba(100,0,0,0.55)',
    '0.3':  '#7a0000',
    '0.5':  '#c41800',
    '0.65': '#ff3b00',
    '0.8':  '#ff8000',
    '0.92': '#ffcc33',
    '1.0':  '#ffe880',
  },
  jet: {
    '0':    'transparent',
    '0.1':  'rgba(0,0,140,0.5)',
    '0.28': '#0055ff',
    '0.48': '#00ccff',
    '0.62': '#00ee88',
    '0.74': '#aaff00',
    '0.84': '#ffdd00',
    '0.93': '#ff8800',
    '1.0':  '#cc0000',
  },
  inferno: {
    '0':    'transparent',
    '0.1':  'rgba(15,10,38,0.5)',
    '0.25': '#3c0a5a',
    '0.45': '#78206d',
    '0.62': '#c83c46',
    '0.78': '#f98e08',
    '1.0':  '#f8e88a',
  },
  viridis: {
    '0':    'transparent',
    '0.1':  'rgba(68,1,84,0.5)',
    '0.28': '#3b538b',
    '0.5':  '#20908d',
    '0.72': '#5ec962',
    '1.0':  '#fde725',
  },
  cividis: {
    '0':    'transparent',
    '0.1':  'rgba(0,34,78,0.5)',
    '0.32': '#2f486f',
    '0.56': '#6c7175',
    '0.78': '#a8a067',
    '1.0':  '#fde945',
  },
}

/** CSS linear-gradient string for the ColorScaleBar legend. */
export function getColorScaleCss(scale: HeatmapScale): string {
  const gradient = HEATMAPJS_GRADIENTS[scale]
  const stops = Object.entries(gradient)
    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    .map(([t, color]) => {
      // Replace 'transparent' at pos 0 with a dark semitransparent stop for the bar
      const c = color === 'transparent' ? 'rgba(0,0,0,0)' : color
      return `${c} ${Math.round(parseFloat(t) * 100)}%`
    })
    .join(', ')
  return `linear-gradient(90deg, ${stops})`
}
