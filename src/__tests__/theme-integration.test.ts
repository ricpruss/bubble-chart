/**
 * Theme Integration Tests
 * Tests the new theme functionality across different builders
 */

// Setup TextEncoder for JSDOM compatibility
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// @ts-ignore
import { JSDOM } from 'jsdom';
import { BubbleChart } from '../index.js';
import { WaveBubble } from '../builders/wave-bubble.js';
import { LiquidBubble } from '../builders/liquid-bubble.js';
import { ChartPipeline } from '../core/pipeline.js';
import { processForVisualization, THEMED_PALETTES, getThemeForChartType } from '../core/utils.js';
import type { BubbleChartData, BubbleChartOptions } from '../types.js';

// Setup DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;

// Mock ResizeObserver and getComputedTextLength
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock getComputedTextLength for SVGTextElement
(global as any).SVGElement.prototype.getComputedTextLength = function() {
  return 100; // arbitrary fixed value for testing
};

const testData: BubbleChartData[] = [
  { name: 'Test1', value: 100, category: 'A', year: 2023 },
  { name: 'Test2', value: 200, category: 'B', year: 2023 },
  { name: 'Test3', value: 150, category: 'C', year: 2023 }
];

describe('Theme Integration Tests', () => {
  // Track all created builders for cleanup
  let createdBuilders: any[] = [];

  afterEach(() => {
    // Clean up any builders that were created
    createdBuilders.forEach((builder) => {
      if (builder && typeof builder.destroy === 'function') {
        try {
          builder.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
    createdBuilders = [];
    
    // Clean up any remaining D3 timers
    if (typeof (global as any).flushAllD3Transitions === 'function') {
      (global as any).flushAllD3Transitions();
    }
  });
  
  describe('Fluent API withTheme method', () => {
    test('withTheme method returns chart instance for chaining', () => {
      const chart = BubbleChart.create('#test-container')
        .withData(testData)
        .withLabel('name')
        .withSize('value')
        .withTheme('ocean');
      
      expect(chart).toBeDefined();
      expect(typeof chart.build).toBe('function');
    });
    
    test('withTheme accepts all valid theme names', () => {
      const themes: Array<'corporate' | 'ocean' | 'sunset' | 'forest' | 'slate' | 'wave'> = 
        ['corporate', 'ocean', 'sunset', 'forest', 'slate', 'wave'];
      
      themes.forEach(theme => {
        const chart = BubbleChart.create('#test-container')
          .withData(testData)
          .withLabel('name')
          .withSize('value')
          .withTheme(theme);
        
        expect(chart).toBeDefined();
      });
    });
  });
  
  describe('Theme system in ChartPipeline', () => {
    test('createColorScale returns both colorScale and theme', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'name',
        size: 'value',
        theme: 'ocean'
      };
      
      const processedData = processForVisualization(
        testData,
        'name',
        'value',
        'category'
      );
      
      const result = ChartPipeline.createColorScale(processedData, config);
      
      expect(result).toHaveProperty('colorScale');
      expect(result).toHaveProperty('theme');
      expect(typeof result.colorScale).toBe('function');
      expect(result.theme).toBeDefined();
    });
    
    test('theme contains expected properties', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'name',
        size: 'value',
        theme: 'ocean'
      };
      
      const processedData = processForVisualization(
        testData,
        'name',
        'value',
        'category'
      );
      
      const { theme } = ChartPipeline.createColorScale(processedData, config);
      
      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('background');
      expect(theme).toHaveProperty('waveBackground');
      expect(theme).toHaveProperty('liquidBackground');
      expect(theme).toHaveProperty('overlayOpacity');
      expect(theme).toHaveProperty('textColor');
      expect(theme).toHaveProperty('strokeColor');
    });
    
    test('default theme is selected when no theme specified', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'name',
        size: 'value'
      };
      
      const processedData = processForVisualization(
        testData,
        'name',
        'value',
        'category'
      );
      
      const { theme } = ChartPipeline.createColorScale(processedData, config);
      
      expect(theme).toBeDefined();
      expect(theme?.colors).toBeDefined();
    });
  });
  
  describe('WaveBubble theme integration', () => {
    test('WaveBubble constructor accepts theme configuration', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'name',
        size: 'value',
        type: 'wave',
        theme: 'ocean',
        percentage: (d: any) => d.value / 200
      };
      
      expect(() => {
        const builder = new WaveBubble(config);
        createdBuilders.push(builder);
      }).not.toThrow();
    });
  });
  
  describe('LiquidBubble theme integration', () => {
    test('LiquidBubble constructor accepts theme configuration', () => {
      const config: BubbleChartOptions = {
        container: '#test-container',
        label: 'name',
        size: 'value',
        type: 'liquid',
        theme: 'wave',
        percentage: (d: any) => d.value / 200
      };
      
      expect(() => {
        const builder = new LiquidBubble(config);
        createdBuilders.push(builder);
      }).not.toThrow();
    });
  });
  
  describe('Themed palettes export', () => {
    test('THEMED_PALETTES is exported and contains all themes', () => {
          expect(THEMED_PALETTES).toBeDefined();
    expect(THEMED_PALETTES).toHaveProperty('corporate');
    expect(THEMED_PALETTES).toHaveProperty('ocean');
    expect(THEMED_PALETTES).toHaveProperty('sunset');
    expect(THEMED_PALETTES).toHaveProperty('forest');
    expect(THEMED_PALETTES).toHaveProperty('slate');
    expect(THEMED_PALETTES).toHaveProperty('wave');
    });
    
    test('Each theme has required structure', () => {
      Object.values(THEMED_PALETTES).forEach(theme => {
        expect(Array.isArray(theme.colors)).toBe(true);
        expect(theme.colors.length).toBeGreaterThan(0);
        expect(typeof theme.background).toBe('string');
        expect(typeof theme.waveBackground).toBe('string');
        expect(typeof theme.liquidBackground).toBe('string');
        expect(typeof theme.overlayOpacity).toBe('number');
        expect(typeof theme.textColor).toBe('string');
        expect(typeof theme.strokeColor).toBe('string');
      });
    });
  });
  
  describe('getThemeForChartType functionality', () => {
    test('getThemeForChartType returns appropriate theme for chart types', () => {
      const theme = getThemeForChartType('wave', 'ocean');
      expect(theme).toBeDefined();
      expect(theme).toBe('ocean');
    });
    
    test('getThemeForChartType returns default theme when no theme specified', () => {
      const theme = getThemeForChartType('bubble');
      expect(theme).toBeDefined();
      expect(theme).toBe('corporate');
    });
  });
  
  describe('Integration with all chart types', () => {
    const chartTypes = ['bubble', 'wave', 'liquid', 'motion', 'tree', 'orbit', 'list'] as const;
    
    chartTypes.forEach(type => {
      test(`${type} chart accepts theme configuration in fluent API`, () => {
        expect(() => {
          const chart = BubbleChart.create('#test-container')
            .withData(testData)
            .withLabel('name')
            .withSize('value')
            .withType(type)
            .withTheme('ocean');
          
          // Just test the fluent API construction, not DOM rendering
          expect(chart).toBeDefined();
          expect(typeof chart.build).toBe('function');
        }).not.toThrow();
      });
    });
  });
});
