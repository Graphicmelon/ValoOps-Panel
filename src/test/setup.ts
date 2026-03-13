import '@testing-library/jest-dom/vitest'

if (typeof HTMLCanvasElement !== 'undefined') {
  const mockGetContext = (() => {
    return {
      canvas: document.createElement('canvas'),
      clearRect: () => {},
      createImageData: () => ({ data: [] }),
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillRect: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as unknown as CanvasRenderingContext2D
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext

  HTMLCanvasElement.prototype.getContext = mockGetContext
}
