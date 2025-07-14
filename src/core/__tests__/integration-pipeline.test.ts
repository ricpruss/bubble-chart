/**
 * Data Processing Pipeline Integration Tests
 * Tests how data flows through the core processing components
 */

// @ts-ignore
import { JSDOM } from 'jsdom';
import { DataProcessor } from '../data-processor.js';
import { SVGManager } from '../svg-manager.js';
import { InteractionManager } from '../interaction-manager.js';
import { ChartPipeline } from '../../builders/shared/chart-pipeline.js';
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
  { name: 'Alpha', value: 100, year: 2023 },
  { name: 'Beta', value: 200, year: 2023 },
  { name: 'Gamma', value: 150, year: 2023 }
];

const baseConfig: BubbleChartOptions = {
  container: '#test-container',
  width: 400,
  height: 300,
  label: 'name',
  size: 'value'
};

describe('Data Processing Pipeline Integration', () => {
  
  describe('DataProcessor Integration', () => {
    test('DataProcessor processes raw data correctly', () => {
      const processor = new DataProcessor(baseConfig);
      
      const processed = processor.process(testData);
      
      expect(processed).toHaveLength(testData.length);
      expect(processed[0]).toHaveProperty('label');
      expect(processed[0]).toHaveProperty('size');
      expect(processed[0]?.size).toBeGreaterThan(0);
    });
    
    test('DataProcessor handles empty data', () => {
      const processor = new DataProcessor(baseConfig);
      
      const processed = processor.process([]);
      
      expect(processed).toHaveLength(0);
    });
    
    test('DataProcessor handles null/undefined data', () => {
      const processor = new DataProcessor(baseConfig);
      
      expect(() => processor.process(null as any)).not.toThrow();
      expect(() => processor.process(undefined as any)).not.toThrow();
    });
  });
  
  describe('SVGManager Integration', () => {
    test('SVGManager creates SVG elements', () => {
      const svgManager = new SVGManager();
      
      const elements = svgManager.initialize(baseConfig);
      
      expect(elements).toBeDefined();
      expect(elements.svg).toBeDefined();
      expect(elements.dimensions).toBeDefined();
    });
    
    test('SVGManager handles container selection', () => {
      const svgManager = new SVGManager();
      
      const elements = svgManager.initialize(baseConfig);
      expect(elements.container).toBeDefined();
      expect(elements.dimensions.width).toBeGreaterThan(0);
      expect(elements.dimensions.height).toBeGreaterThan(0);
    });
    
    test('SVGManager destroy works', () => {
      const svgManager = new SVGManager();
      
      svgManager.initialize(baseConfig);
      expect(() => svgManager.destroy()).not.toThrow();
    });
  });
  
  describe('InteractionManager Integration', () => {
    test('InteractionManager registers event handlers', () => {
      const svgManager = new SVGManager();
      const elements = svgManager.initialize(baseConfig);
      const interactionManager = new InteractionManager(baseConfig, elements.svg);
      
      const handlers = { click: jest.fn() };
      expect(() => interactionManager.registerEventHandlers(handlers)).not.toThrow();
    });
    
    test('InteractionManager handles bubble events', () => {
      const svgManager = new SVGManager();
      const elements = svgManager.initialize(baseConfig);
      const interactionManager = new InteractionManager(baseConfig, elements.svg);
      
      const processor = new DataProcessor(baseConfig);
      const processed = processor.process(testData);
      
      // Create mock bubble selection
      const bubbles = elements.svg.selectAll('.bubble').data(processed);
      
      expect(() => interactionManager.attachBubbleEvents(bubbles, processed)).not.toThrow();
    });
    
    test('InteractionManager destroy works', () => {
      const svgManager = new SVGManager();
      const elements = svgManager.initialize(baseConfig);
      const interactionManager = new InteractionManager(baseConfig, elements.svg);
      
      expect(() => interactionManager.destroy()).not.toThrow();
    });
  });
  
  describe('ChartPipeline Integration', () => {
    test('ChartPipeline processes data with configuration', () => {
      const processed = ChartPipeline.processData(testData, baseConfig);
      
      expect(processed).toHaveLength(testData.length);
      expect(processed[0]).toHaveProperty('label');
      expect(processed[0]).toHaveProperty('size');
    });
    
    test('ChartPipeline creates bubble layout', () => {
      const processed = ChartPipeline.processData(testData, baseConfig);
      const layout = ChartPipeline.createBubbleLayout(processed, 400, 300, 5);
      
      expect(layout).toHaveLength(processed.length);
      expect(layout[0]).toHaveProperty('x');
      expect(layout[0]).toHaveProperty('y');
      expect(layout[0]).toHaveProperty('r');
    });
  });
  
  describe('Full Pipeline Integration', () => {
    test('Complete data flow: raw → processed → layout → rendering', () => {
      // Step 1: Process data
      const processor = new DataProcessor(baseConfig);
      const processed = processor.process(testData);
      
      expect(processed).toHaveLength(testData.length);
      
      // Step 2: Create layout
      const layout = ChartPipeline.createBubbleLayout(processed, 400, 300, 5);
      
      expect(layout).toHaveLength(processed.length);
      expect(layout[0]).toHaveProperty('x');
      expect(layout[0]).toHaveProperty('y');
      
      // Step 3: SVG setup
      const svgManager = new SVGManager();
      const elements = svgManager.initialize(baseConfig);
      
      expect(elements).toBeDefined();
      expect(elements.svg).toBeDefined();
      
      // Step 4: Event system
      const interactionManager = new InteractionManager(baseConfig, elements.svg);
      const handlers = { click: jest.fn() };
      interactionManager.registerEventHandlers(handlers);
      
      expect(handlers.click).toBeDefined();
    });
    
    test('Pipeline handles error conditions gracefully', () => {
      // Test with invalid data
      const processor = new DataProcessor(baseConfig);
      expect(() => processor.process(null as any)).not.toThrow();
      
      // Test with invalid container
      const invalidConfig = { ...baseConfig, container: '#nonexistent' };
      const svgManager = new SVGManager();
      expect(() => svgManager.initialize(invalidConfig)).toThrow();
    });
  });
});