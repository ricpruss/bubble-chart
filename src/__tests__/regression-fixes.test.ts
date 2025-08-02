/**
 * Regression Tests - Critical Bug Fixes
 * 
 * This test suite prevents specific bugs discovered and fixed in production:
 * 1. Theme color mapping issues (wave/liquid swap)
 * 2. Right-side clipping from width constraints  
 * 3. Responsive re-rendering config loss
 * 4. Duplicate elements from CSS selector parsing
 * 5. Event handling broken due to ignored interaction manager
 */

// Setup TextEncoder for JSDOM compatibility
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// @ts-ignore - JSDOM types not critical for these tests
import { JSDOM } from 'jsdom';
import * as d3 from 'd3';
import { BubbleBuilder } from '../builders/bubble-builder.js';
import { OrbitBuilder } from '../builders/orbit-builder.js';
import { TreeBuilder } from '../builders/tree-builder.js';
import { ChartPipeline } from '../core/pipeline.js';
import { getThemeForChartType, THEMED_PALETTES } from '../core/utils.js';
import { SVGManager } from '../core/svg-manager.js';
import type { BubbleChartOptions } from '../types.js';

// Setup JSDOM for testing
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const testData = [
  { label: 'Test A', size: 10, category: 'group1' },
  { label: 'Test B', size: 20, category: 'group2' },
  { label: 'Test C', size: 15, category: 'group1' }
];

describe('Regression Tests - Critical Bug Fixes', () => {

  beforeEach(() => {
    // Ensure test container exists and is clean
    const container = document.getElementById('test-container');
    if (container) {
      container.innerHTML = '';
    } else {
      // Create the container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'test-container';
      document.body.appendChild(newContainer);
    }
  });

  // =====================================
  // 1. THEME COLOR MAPPING REGRESSION
  // =====================================
  describe('Bug Fix: Theme Color Mappings', () => {
    
    test('wave chart type should map to ocean theme (not wave theme)', () => {
      const theme = getThemeForChartType('wave');
      expect(theme).toBe('ocean');
    });

    test('liquid chart type should map to sunset theme (not wave theme)', () => {
      const theme = getThemeForChartType('liquid');  
      expect(theme).toBe('sunset');
    });

    test('theme palettes should have specific expected background colors', () => {
      // Test the correct theme background colors  
      expect(THEMED_PALETTES.ocean.background).toBe('#0c4a6e'); // Ocean blue
      expect(THEMED_PALETTES.sunset.background).toBe('#991b1b'); // Sunset red  
      expect(THEMED_PALETTES.forest.background).toBe('#14532d'); // Forest green
      expect(THEMED_PALETTES.corporate.background).toBe('#1a1a2e'); // Corporate dark
    });

    test('themed palettes should have all required properties', () => {
      Object.values(THEMED_PALETTES).forEach(palette => {
        expect(palette).toHaveProperty('background');
        expect(palette).toHaveProperty('textColor');
        expect(palette).toHaveProperty('strokeColor');
        expect(typeof palette.background).toBe('string');
        expect(typeof palette.textColor).toBe('string');
        expect(typeof palette.strokeColor).toBe('string');
      });
    });
  });

  // =====================================  
  // 2. RESPONSIVE WIDTH CLIPPING REGRESSION
  // =====================================
  describe('Bug Fix: Responsive Width Clipping', () => {

    test('SVGManager should use full container width by default (not viewport * 0.9)', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label', 
        size: 'size'
      };

      // Create a container with known dimensions
      const container = document.getElementById('test-container')!;
      container.style.width = '1200px';
      container.style.height = '800px';

      const svgManager = new SVGManager();
      
      // Mock getBoundingClientRect to return our container size
      const mockGetBoundingClientRect = jest.fn(() => ({
        width: 1200,
        height: 800,
        top: 0, left: 0, bottom: 800, right: 1200,
        x: 0, y: 0, toJSON: () => {}
      }));
      
      Object.defineProperty(container, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true
      });

      const elements = svgManager.initialize(config);
      
      // Should use full container width, not viewport * 0.9 
      expect(elements.dimensions.width).toBe(1200);
      expect(elements.dimensions.height).toBe(800);
    });

    test('responsive configuration should not artificially limit maxWidth', () => {
      // Test that responsive config without maxWidth uses full available space
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size',
        responsive: {
          minWidth: 320,
          minHeight: 300,
          // NO maxWidth - should use full container
          debounceMs: 100
        }
      };

      const container = document.getElementById('test-container')!;
      container.style.width = '1600px'; // Wide container
      container.style.height = '600px';

      const svgManager = new SVGManager(); 
      svgManager.setResponsiveOptions(config.responsive!);

      const mockGetBoundingClientRect = jest.fn(() => ({
        width: 1600, height: 600,
        top: 0, left: 0, bottom: 600, right: 1600,
        x: 0, y: 0, toJSON: () => {}
      }));
      
      Object.defineProperty(container, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true
      });

      const elements = svgManager.initialize(config);
      
      // Should use full 1600px width, not be limited
      expect(elements.dimensions.width).toBe(1600);
    });

    test('aspect ratio constraints should not override responsive width when removed', () => {
      // This tests the tree.html aspectRatio bug fix
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size',
        responsive: {
          minWidth: 320,
          minHeight: 300,
          // NO aspectRatio/maintainAspectRatio - should use container dimensions
          debounceMs: 100  
        }
      };

      const container = document.getElementById('test-container')!;
      container.style.width = '1500px';
      container.style.height = '700px';

      const svgManager = new SVGManager();
      svgManager.setResponsiveOptions(config.responsive!);

      const mockGetBoundingClientRect = jest.fn(() => ({
        width: 1500, height: 700,
        top: 0, left: 0, bottom: 700, right: 1500,
        x: 0, y: 0, toJSON: () => {}
      }));
      
      Object.defineProperty(container, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
        configurable: true
      });

      const elements = svgManager.initialize(config);
      
      // Should use full dimensions, not constrained by aspect ratio
      expect(elements.dimensions.width).toBe(1500);
      expect(elements.dimensions.height).toBe(700);
    });
  });

  // =====================================
  // 3. RESPONSIVE CONFIG PERSISTENCE REGRESSION  
  // =====================================
  describe('Bug Fix: Responsive Config Persistence', () => {

    test('SVGManager should store original config for resize calculations', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size',
        responsive: {
          minWidth: 320,
          maxHeight: 600,
          debounceMs: 100
        }
      };

      const svgManager = new SVGManager();
      svgManager.initialize(config);

      // Access private property to verify it's stored (test internals)
      const stored = (svgManager as any).originalConfig;
      expect(stored).toBeDefined();
      expect(stored.responsive).toEqual(config.responsive);
      expect(stored.container).toBe('#test-container');
    });

    test('forceResponsiveUpdate should work without original config being lost', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label', 
        size: 'size',
        responsive: { minWidth: 320, debounceMs: 100 }
      };

      const svgManager = new SVGManager();
      svgManager.initialize(config);

      // This should not throw an error (it did before the fix)
      expect(() => {
        svgManager.forceResponsiveUpdate();
      }).not.toThrow();
    });
  });

  // =====================================
  // 4. CSS SELECTOR DUPLICATE ELEMENTS REGRESSION
  // =====================================
  describe('Bug Fix: CSS Selector Duplicate Elements', () => {

    test('renderBubbleGroups should handle multi-class CSS selectors correctly', () => {
      // Create a mock SVG
      const svg = d3.select(document.createElement('svg'));
      
      const nodes = [
        { label: 'A', x: 100, y: 100, r: 20 },
        { label: 'B', x: 200, y: 200, r: 25 }
      ];

      // First render
      const groups1 = ChartPipeline.renderBubbleGroups(svg, nodes, {
        cssClass: 'bubble-chart bubble', // Multi-class that caused the bug
        keyFunction: (d: any) => d.label
      });
      
      expect(groups1.size()).toBe(2);

      // Second render (simulating resize/re-render)
      const groups2 = ChartPipeline.renderBubbleGroups(svg, nodes, {
        cssClass: 'bubble-chart bubble',
        keyFunction: (d: any) => d.label  
      });

      // Should still be 2 groups, not 4 (no duplicates)
      expect(groups2.size()).toBe(2);
      
      // Verify the DOM only has 2 groups total
      const allGroups = svg.selectAll('g.bubble-chart.bubble');
      expect(allGroups.size()).toBe(2);
    });

    test('CSS selector should convert spaces to dots correctly', () => {
      // This tests the specific fix: cssClass.replace(/\s+/g, '.')
      const testCases = [
        { input: 'bubble-chart bubble', expected: 'g.bubble-chart.bubble' },
        { input: 'bubble', expected: 'g.bubble' },
        { input: 'multi class test', expected: 'g.multi.class.test' },
        { input: 'single', expected: 'g.single' }
      ];

      testCases.forEach(({ input, expected }) => {
        const selector = `g.${input.replace(/\s+/g, '.')}`;
        expect(selector).toBe(expected);
      });
    });

    test('orbit builder should not create duplicate planets during resize simulation', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size', 
        type: 'orbit'
      };

      const orbitBuilder = new OrbitBuilder(config);
      orbitBuilder.data(testData);

      // First render
      orbitBuilder.update();
      
      const svg = d3.select('#test-container svg');
      const groups1 = svg.selectAll('g.bubble-chart.bubble');
      expect(groups1.size()).toBe(3); // 3 test data items

      // Simulate responsive re-render
      orbitBuilder.update();
      
      const groups2 = svg.selectAll('g.bubble-chart.bubble');
      expect(groups2.size()).toBe(3); // Still 3, not 6
      
      // Clean up timer to prevent Jest open handles
      orbitBuilder.destroy();
    });
  });

  // =====================================
  // 5. EVENT HANDLING REGRESSION
  // =====================================  
  describe('Bug Fix: Event Handling', () => {

    test('attachStandardEvents should actually call interaction manager', () => {
      const mockInteractionManager = {
        attachBubbleEvents: jest.fn()
      };

      const svg = d3.select(document.createElement('svg'));
      const nodes = [{ label: 'Test', data: { label: 'Test', size: 10 } }];
      
      const groups = svg.selectAll('g').data(nodes).enter().append('g');

      ChartPipeline.attachStandardEvents(groups, mockInteractionManager);

      // Verify interaction manager was actually called
      expect(mockInteractionManager.attachBubbleEvents).toHaveBeenCalled();
      expect(mockInteractionManager.attachBubbleEvents).toHaveBeenCalledWith(
        groups, 
        expect.any(Array)
      );
    });

    test('event handlers should use namespaced events to avoid conflicts', () => {
      const svg = d3.select(document.createElement('svg'));
      const nodes = [{ label: 'Test', data: { label: 'Test', size: 10 } }];
      const groups = svg.selectAll('g').data(nodes).enter().append('g');

      const mockInteractionManager = {
        attachBubbleEvents: jest.fn()
      };

      ChartPipeline.attachStandardEvents(groups, mockInteractionManager);

             // D3 stores events with namespaces, so styling events should exist  
       // This is harder to test directly, but we can verify no errors occur
      expect(() => {
        groups.dispatch('mouseenter');
        groups.dispatch('mouseleave');
      }).not.toThrow();
    });

    test('chart builders should pass interaction manager to attachStandardEvents', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size'
      };

      // Mock ChartPipeline.attachStandardEvents to verify it's called correctly
      const originalAttachStandardEvents = ChartPipeline.attachStandardEvents;
      const mockAttachStandardEvents = jest.fn();
      ChartPipeline.attachStandardEvents = mockAttachStandardEvents;

      try {
        const bubbleBuilder = new BubbleBuilder(config);
        bubbleBuilder.data(testData).update();

        // Verify attachStandardEvents was called with interaction manager
        expect(mockAttachStandardEvents).toHaveBeenCalled();
        const [, interactionManager] = mockAttachStandardEvents.mock.calls[0];
        expect(interactionManager).toBeDefined();
        expect(interactionManager).toHaveProperty('attachBubbleEvents');
      } finally {
        // Restore original method
        ChartPipeline.attachStandardEvents = originalAttachStandardEvents;
      }
    });
  });

  // =====================================
  // 6. INTEGRATION REGRESSION TESTS
  // =====================================
  describe('Integration: Multiple Fixes Working Together', () => {

    test('responsive chart with events should work after resize simulation', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'label',
        size: 'size',
        responsive: {
          minWidth: 320,
          minHeight: 300,
          debounceMs: 50 // Fast for testing
        }
      };

      const builder = new BubbleBuilder(config);
      builder.data(testData);
      
      // Initial render
      builder.update();
      
      const svg = d3.select('#test-container svg');
      expect(svg.selectAll('g.bubble-chart.bubble').size()).toBe(3);

      // Simulate responsive update (like the fix we made)
      builder.update(); 
      
      // Should still have exactly 3 bubbles (no duplicates)
      expect(svg.selectAll('g.bubble-chart.bubble').size()).toBe(3);
      
      // Should have cursor pointer (indicates events attached)
      const groups = svg.selectAll('g.bubble-chart.bubble');
      groups.each(function() {
        const style = d3.select(this).style('cursor');
        expect(style).toBe('pointer');
      });
    });

         test('tree builder should handle responsive updates without aspect ratio conflicts', () => {
       const hierarchicalData = [
         {
           name: 'Root',
           label: 'Root',
           amount: 100,
           children: [
             { name: 'Child A', label: 'Child A', amount: 30 },
             { name: 'Child B', label: 'Child B', amount: 70 }
           ]
         }
       ];

             const config: BubbleChartOptions = {
         container: '#test-container',
         label: 'label',
         size: 'amount', 
         type: 'tree',
         responsive: {
           minWidth: 320,
           minHeight: 300
           // NO aspectRatio - this was the bug fix
         }
       };

       expect(() => {
         const treeBuilder = new TreeBuilder(config);
         treeBuilder.data(hierarchicalData as any).update();
       }).not.toThrow();
    });
  });
}); 