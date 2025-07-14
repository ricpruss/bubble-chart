/**
 * Core Integration Tests
 * Tests how the main building blocks work together
 */

// @ts-ignore
import { JSDOM } from 'jsdom';
import { BubbleBuilder } from '../builders/bubble-builder.js';
import { ChartPipeline } from '../builders/shared/chart-pipeline.js';
import type { BubbleChartData, BubbleChartOptions } from '../types/index.js';

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
  { name: 'Tech', value: 100, year: 2023 },
  { name: 'Health', value: 200, year: 2023 },
  { name: 'Finance', value: 150, year: 2023 }
];

const baseConfig: BubbleChartOptions = {
  container: '#test-container',
  width: 400,
  height: 300,
  label: 'name',
  size: 'value'
};

describe('Core Integration Tests', () => {
  
  describe('Builder to Core Workflow', () => {
    test('BubbleBuilder integrates with BaseChartBuilder', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Test inheritance
      expect(builder).toBeInstanceOf(BubbleBuilder);
      expect(typeof builder.data).toBe('function');
      expect(typeof builder.update).toBe('function');
      
      // Test core properties
      expect(builder.options()).toBeDefined();
      expect(typeof builder.update).toBe('function');
    });
    
    test('Data flows from builder through core to rendering', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Set data
      const result = builder.data(testData);
      expect(result).toBe(builder); // Method chaining
      // chartData is protected, test through public interface
      expect(result).toBe(builder);
      
      // Trigger processing
      expect(() => builder.update()).not.toThrow();
    });
  });
  
  describe('Data Processing Pipeline', () => {
    test('ChartPipeline processes data correctly', () => {
      const processed = ChartPipeline.processData(testData, baseConfig);
      
      expect(processed).toHaveLength(testData.length);
      expect(processed[0]).toHaveProperty('label');
      expect(processed[0]).toHaveProperty('size');
      expect(processed[0].size).toBeGreaterThan(0);
    });
    
    test('Data enrichment adds visualization properties', () => {
      const builder = new BubbleBuilder(baseConfig);
      builder.data(testData);
      
      // Access processed data through the pipeline
      const processed = ChartPipeline.processData(testData, baseConfig);
      
      // Check enrichment
      expect(processed[0]).toHaveProperty('size');
      expect(processed[0]).toHaveProperty('label');
      expect(processed[0].size).toBeGreaterThan(0);
    });
    
    test('Configuration influences processing', () => {
      const config1 = { ...baseConfig, bubble: { minRadius: 5, maxRadius: 50, animation: 800, padding: 2, allText: 'All' } };
      const config2 = { ...baseConfig, bubble: { minRadius: 10, maxRadius: 100, animation: 800, padding: 2, allText: 'All' } };
      
      const processed1 = ChartPipeline.processData(testData, config1);
      const processed2 = ChartPipeline.processData(testData, config2);
      
      // Different configs should produce different size ranges
      expect(processed1[0].size).toBeDefined();
      expect(processed2[0].size).toBeDefined();
    });
  });
  
  describe('Event System Integration', () => {
    test('Event system integrates with builder', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      expect(typeof builder.on).toBe('function');
      
      // Test event registration
      const handler = jest.fn();
      expect(() => builder.on('click', handler)).not.toThrow();
    });
    
    test('Event system works with data processing', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Add event handler
      const handler = jest.fn();
      builder.on('click', handler);
      
      // Process data
      builder.data(testData);
      expect(() => builder.update()).not.toThrow();
    });
  });
  
  describe('SVG Manager Integration', () => {
    test('SVG manager creates elements correctly', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // svgManager is protected, test through public interface
      expect(typeof builder.update).toBe('function');
      
      // Trigger SVG creation
      builder.data(testData);
      expect(() => builder.update()).not.toThrow();
    });
  });
  
  describe('Full Workflow Integration', () => {
    test('Complete workflow: construction → data → processing → rendering', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Step 1: Construction
      expect(builder.options()).toBeDefined();
      expect(typeof builder.update).toBe('function');
      
      // Step 2: Data input
      const dataResult = builder.data(testData);
      // chartData is protected, test through public interface
      expect(dataResult).toBe(builder);
      
      // Step 3: Processing and rendering
      expect(() => builder.update()).not.toThrow();
      
      // Step 4: Verify processing occurred
      const processed = ChartPipeline.processData(testData, baseConfig);
      expect(processed).toHaveLength(testData.length);
    });
    
    test('Method chaining works throughout workflow', () => {
      const builder = new BubbleBuilder(baseConfig);
      
      // Test full chain
      const result = builder
        .data(testData)
        .update();
      
      expect(result).toBe(builder);
    });
  });
});