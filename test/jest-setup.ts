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

// D3 cleanup utilities to prevent hanging timers
import * as d3 from 'd3';

// Global D3 cleanup function
(global as any).flushAllD3Transitions = function() {
  try {
    // Store original performance.now
    const originalNow = performance.now;
    
    // Force all transitions to complete immediately
    performance.now = () => Infinity;
    d3.timerFlush();
    
    // Restore original performance.now
    performance.now = originalNow;
    
    // Interrupt any remaining transitions
    d3.selectAll('*').interrupt();
  } catch (error) {
    // Ignore cleanup errors in test environment
  }
};

// Setup and cleanup functions available globally
// Individual test files can use these in their beforeEach/afterEach hooks
