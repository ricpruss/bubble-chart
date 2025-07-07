// Basic DOM-like stubs for unit tests running in Node environment

if (typeof global.document === 'undefined') {
  (global as any).document = {
    createElement: jest.fn(() => ({
      style: {},
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getContext: jest.fn()
    })),
    querySelectorAll: jest.fn(() => []), // Return empty array for D3 selectAll
    querySelector: jest.fn(() => null)
  };
}

if (typeof global.window === 'undefined') {
  (global as any).window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 1024,
    innerHeight: 768
  };
} 