import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock PointerEvent for jsdom
if (typeof window !== 'undefined' && !window.PointerEvent) {
  // @ts-expect-error Mock PointerEvent using MouseEvent in jsdom
  window.PointerEvent = window.MouseEvent;
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

// Mock HTMLCanvasElement.getContext for 3D/Canvas tests
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Array(4) }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
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
    };
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// Suppress React warnings in jsdom for Three.js/R3F custom element JSX tags
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('is using incorrect casing') ||
    msg.includes('is unrecognized in this browser') ||
    msg.includes('React does not recognize the') ||
    msg.includes('for a non-boolean attribute')
  ) {
    return;
  }
  originalConsoleError(...args);
};
