/**
 * Test suite for RenderingPipeline
 * Validates color function handling and bubble rendering logic
 */

// Mock D3.js to avoid ES module issues in Jest
jest.mock('d3', () => ({
  scaleOrdinal: jest.fn(() => {
    const mockScale = (value: string) => {
      const colors = ['#FF6384', '#4BC0C0', '#FFCE56'];
      return colors[value.charCodeAt(0) % colors.length];
    };
    mockScale.range = jest.fn().mockReturnThis();
    mockScale.domain = jest.fn().mockReturnThis();
    return mockScale;
  }),
  scalePow: jest.fn(() => ({
    exponent: jest.fn().mockReturnThis(),
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis()
  })),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    clamp: jest.fn().mockReturnThis()
  })),
  pack: jest.fn(() => {
    const packLayout = () => {
      return {
        descendants: () => [{ x: 100, y: 100, r: 50, data: {} }]
      };
    };
    packLayout.size = jest.fn().mockReturnThis();
    packLayout.padding = jest.fn().mockReturnThis();
    return packLayout;
  }),
  hierarchy: jest.fn((_data) => ({
    sum: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis()
  })),
  min: jest.fn(() => 10),
  max: jest.fn(() => 50),
  select: jest.fn(() => ({
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    transition: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    ease: jest.fn().mockReturnThis(),
    node: jest.fn(() => ({ parentElement: { clientWidth: 800, clientHeight: 600 } }))
  }))
}));

import { RenderingPipeline, type RenderingContext } from '../rendering-pipeline.js';
import type { BubbleChartOptions } from '../../types/config.js';
import type { ProcessedDataPoint } from '../data-processor.js';
import type { FlatBubbleData } from '../../types/data.js';

// Test data
interface TestData extends FlatBubbleData {
  name: string;
  value: number;
  sector: string;
  category: string;
  label: string;
  size: number;
}

const testData: TestData[] = [
  { name: 'Apple', value: 100, sector: 'Technology', category: 'Tech', label: 'Apple', size: 100 },
  { name: 'Amazon', value: 80, sector: 'Retailing', category: 'Commerce', label: 'Amazon', size: 80 },
  { name: 'Microsoft', value: 90, sector: 'Technology', category: 'Tech', label: 'Microsoft', size: 90 },
  { name: 'Walmart', value: 70, sector: 'Retailing', category: 'Commerce', label: 'Walmart', size: 70 },
  { name: 'Google', value: 85, sector: 'Technology', category: 'Tech', label: 'Google', size: 85 }
];


describe('RenderingPipeline', () => {
  let mockContext: RenderingContext;
  let pipeline: RenderingPipeline<TestData>;

  beforeEach(() => {
    // Create mock SVG context
    const mockSvg = {
      selectAll: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({ parentElement: { clientWidth: 800, clientHeight: 600 } }))
    };

    mockContext = {
      svg: mockSvg,
      width: 800,
      height: 600,
      config: {
        container: '#test',
        label: 'name',
        size: 'value',
        defaultColor: '#ddd'
      } as BubbleChartOptions
    };

    pipeline = new RenderingPipeline<TestData>(mockContext);
  });

  describe('Streaming Update with D3-Native Patterns', () => {
    it('should perform streaming update with enter/update/exit pattern', () => {
      // Mock processed data points
      const processedData: ProcessedDataPoint<TestData>[] = testData.map(d => ({
        data: d,
        label: d.name,
        size: d.value,
        color: d.sector
      }));

      // Mock streaming options
      const streamingOptions = {
        enterAnimation: { duration: 800, staggerDelay: 50, easing: 'ease-out' },
        updateAnimation: { duration: 600, easing: 'ease-in-out' },
        exitAnimation: { duration: 400, easing: 'ease-in' },
        keyFunction: (d: any) => d.data?.name || 'unknown'
      };

      // Call streamingUpdate method
      const result = pipeline.streamingUpdate(processedData, streamingOptions);

      // Verify the method returns proper result structure
      expect(result).toHaveProperty('entered');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('exited');
      expect(typeof result.entered).toBe('number');
      expect(typeof result.updated).toBe('number');
      expect(typeof result.exited).toBe('number');
    });

    it('should handle empty data gracefully', () => {
      const streamingOptions = {
        enterAnimation: { duration: 800, staggerDelay: 50, easing: 'ease-out' },
        updateAnimation: { duration: 600, easing: 'ease-in-out' },
        exitAnimation: { duration: 400, easing: 'ease-in' },
        keyFunction: (d: any) => d.data?.name || 'unknown'
      };

      const result = pipeline.streamingUpdate([], streamingOptions);

      expect(result.entered).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.exited).toBe(0);
    });

    
    it('should handle data with color values correctly', () => {
      // Mock processed data points with color values
      const processedDataWithColors: ProcessedDataPoint<TestData>[] = testData.map(d => ({
        data: d,
        label: d.name,
        size: d.value,
        color: d.sector,
        colorValue: d.sector // Add colorValue for D3DataUtils compatibility
      }));

      const streamingOptions = {
        enterAnimation: { duration: 800, staggerDelay: 50, easing: 'ease-out' },
        updateAnimation: { duration: 600, easing: 'ease-in-out' },
        exitAnimation: { duration: 400, easing: 'ease-in' },
        keyFunction: (d: any) => d.data?.name || 'unknown'
      };

      // Should not throw when processing data with colors
      expect(() => {
        pipeline.streamingUpdate(processedDataWithColors, streamingOptions);
      }).not.toThrow();
    });

    it('should calculate optimal timing for staggered animations', () => {
      const processedData: ProcessedDataPoint<TestData>[] = testData.map(d => ({
        data: d,
        label: d.name,
        size: d.value,
        color: d.sector
      }));

      // Test with high stagger delay to trigger timing optimization
      const streamingOptions = {
        enterAnimation: { duration: 500, staggerDelay: 100, easing: 'ease-out' },
        updateAnimation: { duration: 200, easing: 'ease-in-out' }, // Short duration to trigger adjustment
        exitAnimation: { duration: 400, easing: 'ease-in' },
        keyFunction: (d: any) => d.data?.name || 'unknown'
      };

      // Should handle timing optimization without errors
      expect(() => {
        pipeline.streamingUpdate(processedData, streamingOptions);
      }).not.toThrow();
    });
  });
});
