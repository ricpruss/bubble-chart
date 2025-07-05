#!/usr/bin/env node

/**
 * Smoke Test - Quick verification that the library works
 * Run with: npm run test:smoke
 * 
 * Purpose: Fast "does it work?" check for library functionality
 * Runtime: ~5 seconds
 * Coverage: Basic instantiation, rendering, method chaining, cleanup
 */

// Mock DOM for Node.js
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Test data
const testData = [
  { name: 'Tech', value: 100 },
  { name: 'Health', value: 80 },
  { name: 'Finance', value: 120 }
];

const config = {
  container: '#chart',
  width: 400,
  height: 300
};

// Test counter
let testCount = 0;
let passedTests = 0;

function test(name, testFn) {
  testCount++;
  try {
    testFn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runSmokeTests() {
  console.log('Bubble Chart - Smoke Tests');
  console.log('=============================');

  try {
    // Import from built bundle
    const { BubbleBuilder, BubbleChart } = await import('../dist/bubble-chart.esm.js');

    if (!BubbleBuilder || !BubbleChart) {
      throw new Error('Failed to import BubbleBuilder or BubbleChart from dist bundle');
    }

    // Create test container
    const container = document.createElement('div');
    container.id = 'chart';
    document.body.appendChild(container);

    // Test BubbleBuilder (low-level API)
    test('BubbleBuilder instantiation', () => {
      const builder = new BubbleBuilder(config);
      if (!builder) throw new Error('BubbleBuilder not created');
    });

    test('Data processing', () => {
      const builder = new BubbleBuilder(config);
      const result = builder.data(testData);
      if (result !== builder) throw new Error('data() should return this for chaining');
    });

    test('SVG rendering', () => {
      const builder = new BubbleBuilder(config);
      builder.data(testData);
      const result = builder.render();
      if (result !== builder) throw new Error('render() should return this for chaining');
    });

    test('Method chaining', () => {
      const builder = new BubbleBuilder(config);
      const result = builder.data(testData).render();
      if (result !== builder) throw new Error('Method chaining failed');
    });

    test('Event handling', () => {
      const builder = new BubbleBuilder(config);
      if (builder.on) {
        const result = builder.on('click', () => {});
        if (result !== builder) throw new Error('on() should return this for chaining');
      }
    });

    test('Resource cleanup', () => {
      const builder = new BubbleBuilder(config);
      builder.data(testData).render();
      if (builder.destroy) {
        builder.destroy();
      }
      // If we get here without error, cleanup worked
    });

    // Test modern fluent API (main user-facing API)
    test('BubbleChart fluent API', () => {
      const chart = BubbleChart.create('#chart')
        .withData(testData)
        .withLabel('name')
        .withSize('value')
        .render();
      if (!chart) throw new Error('BubbleChart fluent API failed');
    });

  } catch (error) {
    console.log(`❌ Library import: ${error.message}`);
    return false;
  }

  // Results
  console.log('=============================');
  console.log(`Results: ${passedTests}/${testCount} tests passed`);
  
  if (passedTests === testCount) {
    console.log('All smoke tests passed.');
    return true;
  } else {
    console.log(`${testCount - passedTests} tests failed`);
    return false;
  }
}

// Run tests
runSmokeTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Smoke test execution failed:', error);
  process.exit(1);
}); 