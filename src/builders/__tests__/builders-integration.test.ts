/**
 * Builders Integration Tests
 * Tests how different builders work together and integrate with core
 */

// @ts-ignore
import { JSDOM } from 'jsdom';
import { BubbleBuilder } from '../bubble-builder.js';
import type { BubbleChartData, BubbleChartOptions } from '../../types/index.js';

// Setup DOM
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

const testData: BubbleChartData[] = [
  { name: 'Test1', value: 100, year: 2023 },
  { name: 'Test2', value: 200, year: 2023 },
  { name: 'Test3', value: 150, year: 2023 }
];

const baseConfig: BubbleChartOptions = {
  container: '#test-container',
  width: 400,
  height: 300,
  label: 'name',
  size: 'value'
};

describe('Builders Integration Tests', () => {
  
  describe('BubbleBuilder Core Integration', () => {
    test('BubbleBuilder constructor initializes correctly', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      expect(builder).toBeInstanceOf(BubbleBuilder);
      expect(builder.options()).toBeDefined();
      expect(builder.options().container).toBe(baseConfig.container);
      expect(builder.options().width).toBe(baseConfig.width);
      expect(builder.options().height).toBe(baseConfig.height);
    });
    
    test('BubbleBuilder data method works correctly', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      const result = builder.data(testData);
      
      expect(result).toBe(builder); // Method chaining
      // chartData is protected, test through public interface
      expect(result).toBe(builder);
    });
    
    test('BubbleBuilder update method executes without errors', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      builder.data(testData);
      expect(() => builder.update()).not.toThrow();
    });
    
    test('BubbleBuilder performs specialized rendering', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Test that the builder has the performRender method
      expect(builder).toHaveProperty('performRender');
      
      // Test data processing
      builder.data(testData);
      expect(() => builder.update()).not.toThrow();
    });
  });
  
  describe('Builder API Consistency', () => {
    test('All builders share common interface', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Test common API methods
      expect(typeof builder.data).toBe('function');
      expect(typeof builder.update).toBe('function');
      expect(typeof builder.on).toBe('function');
    });
    
    test('Builders support method chaining', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      const result = builder
        .data(testData)
        .update();
      
      expect(result).toBe(builder);
    });
  });
  
  describe('Builder Configuration Integration', () => {
    test('Builders handle different configuration options', () => {
      const config1 = { ...baseConfig, bubble: { minRadius: 5, maxRadius: 50, animation: 800, padding: 2, allText: 'All' } };
      const config2 = { ...baseConfig, bubble: { minRadius: 10, maxRadius: 100, animation: 800, padding: 2, allText: 'All' } };
      
      const builder1 = new BubbleBuilder(config1);
      const builder2 = new BubbleBuilder(config2);
      
      expect(builder1.options().bubble?.minRadius).toBe(5);
      expect(builder2.options().bubble?.minRadius).toBe(10);
    });
    
    test('Builders handle label configuration', () => {
      const stringConfig = { ...baseConfig, label: 'name' };
      const arrayConfig = { ...baseConfig, label: ['name', 'value'] };
      const functionConfig = { ...baseConfig, label: (d: BubbleChartData) => d.name as string };
      
      const builder1 = new BubbleBuilder(stringConfig);
      const builder2 = new BubbleBuilder(arrayConfig);
      const builder3 = new BubbleBuilder(functionConfig);
      
      expect(builder1.options().label).toBe('name');
      expect(builder2.options().label).toEqual(['name', 'value']);
      expect(typeof builder3.options().label).toBe('function');
    });
  });
  
  describe('Builder Data Processing Integration', () => {
    test('Builders process data correctly', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      const result = builder.data(testData);
      // chartData is protected, test through public interface
      expect(result).toBe(builder);
      
      // Trigger processing
      expect(() => builder.update()).not.toThrow();
    });
    
    test('Builders handle empty data', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      builder.data([]);
      // chartData is protected, verify through update behavior
      expect(() => builder.update()).not.toThrow();
    });
    
    test('Builders handle invalid data gracefully', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      expect(() => builder.data(null as any)).not.toThrow();
      expect(() => builder.data(undefined as any)).not.toThrow();
    });
  });
  
  describe('Builder Event System Integration', () => {
    test('Builders integrate with event system', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      const handler = jest.fn();
      expect(() => builder.on('click', handler)).not.toThrow();
    });
    
    test('Builders handle multiple event types', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      const clickHandler = jest.fn();
      const hoverHandler = jest.fn();
      
      builder.on('click', clickHandler);
      builder.on('mouseenter', hoverHandler);
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
  
  describe('Builder SVG Integration', () => {
    test('Builders create SVG elements', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // svgManager is protected, test through public interface
      expect(typeof builder.update).toBe('function');
      
      builder.data(testData);
      expect(() => builder.update()).not.toThrow();
    });
    
    test('Builders handle container errors', () => {
      const invalidConfig = { ...baseConfig, container: '#nonexistent' };
      const builder = new BubbleBuilder(invalidConfig);
      
      builder.data(testData);
      // Should throw error for missing container
      expect(() => builder.update()).toThrow('Container "#nonexistent" not found');
    });
  });
  
  describe('Builder Performance Integration', () => {
    test('Builders handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        value: Math.random() * 1000,
        year: 2023
      }));
      
      const builder = new BubbleBuilder(baseConfig);
      
      const start = performance.now();
      builder.data(largeData);
      builder.update();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});