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
  pack: jest.fn(() => ({
    size: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis()
  })),
  hierarchy: jest.fn(),
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

import { RenderingPipeline, type RenderingContext, type LayoutNode } from '../rendering-pipeline.js';
import type { BubbleChartConfig } from '../../types/config.js';
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

const createProcessedDataPoint = (data: TestData, config?: { colorField?: string }): ProcessedDataPoint<TestData> => ({
  data,
  label: data.name,
  size: data.value,
  // Simulate what DataProcessor would do - extract color based on config
  color: config?.colorField ? (data as any)[config.colorField] : data.sector
});

const createLayoutNode = (data: TestData, index: number): LayoutNode => ({
  x: 100 + index * 50,
  y: 100 + index * 50,
  r: 10 + data.value / 10,
  data: createProcessedDataPoint(data)
});

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
      } as BubbleChartConfig
    };

    pipeline = new RenderingPipeline<TestData>(mockContext);
  });

  describe('Color Function Handling', () => {
    describe('Single-parameter color functions', () => {
                    it('should pass full data object to single-parameter color function', () => {
         const colorFn = jest.fn((d: TestData) => `#${d.sector.slice(0, 6)}`);
         mockContext.config.color = colorFn as any;

         const layoutNode = createLayoutNode(testData[0]!, 0);
         
         // Access the private method via type casting
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(colorFn).toHaveBeenCalledWith(testData[0]!);
         expect(result).toBe('#Techno');
       });

             it('should handle single-parameter functions with sector-based logic', () => {
         const sectorColors: Record<string, string> = {
           'Technology': '#3498db',
           'Retailing': '#e74c3c',
           'Finance': '#2ecc71'
         };
         
         const colorFn = jest.fn((d: TestData) => sectorColors[d.sector] || '#999');
         mockContext.config.color = colorFn as any;

         testData.forEach((data, index) => {
           const layoutNode = createLayoutNode(data, index);
           const result = (pipeline as any).getCircleColor(layoutNode, index);
           
           expect(colorFn).toHaveBeenCalledWith(data);
           expect(result).toBe(sectorColors[data.sector] || '#999');
         });
       });
     });

     describe('Multi-parameter color functions', () => {
       it('should pass data and index to multi-parameter color function', () => {
         const colorFn = jest.fn((d: TestData, i: number) => `color-${d.sector}-${i}`);
         mockContext.config.color = colorFn as any;

         const layoutNode = createLayoutNode(testData[0]!, 0);
         
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(colorFn).toHaveBeenCalledWith(testData[0]!, 0);
         expect(result).toBe('color-Technology-0');
       });

       it('should work with alternating color schemes', () => {
         const colorFn = jest.fn((_d: TestData, i: number) => 
           i % 2 === 0 ? '#blue' : '#red'
         );
         mockContext.config.color = colorFn as any;

         testData.forEach((data, index) => {
           const layoutNode = createLayoutNode(data, index);
           const result = (pipeline as any).getCircleColor(layoutNode, index);
           
           expect(colorFn).toHaveBeenCalledWith(data, index);
           expect(result).toBe(index % 2 === 0 ? '#blue' : '#red');
         });
       });
     });

          describe('D3 scales', () => {
       it('should pass sector string to D3 scale', () => {
         const mockScale = jest.fn((key: string) => `scale-color-${key}`);
         // Add D3 scale properties to make it identifiable as a scale
         (mockScale as any).domain = jest.fn().mockReturnThis();
         (mockScale as any).range = jest.fn().mockReturnThis();
         mockContext.config.color = mockScale as any;
         mockContext.config.colour = 'sector'; // Set the color field so DataProcessor knows what to extract

         // Create layout node with processed data that includes color field
         const processedData = createProcessedDataPoint(testData[0]!, { colorField: 'sector' });
         const layoutNode: LayoutNode = {
           x: 100,
           y: 100,
           r: 20,
           data: processedData
         };
         
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(mockScale).toHaveBeenCalledWith('Technology');
         expect(result).toBe('scale-color-Technology');
       });

       it('should fallback to category then index for D3 scale', () => {
         const mockScale = jest.fn((key: string) => `scale-color-${key}`);
         // Add D3 scale properties to make it identifiable as a scale
         (mockScale as any).domain = jest.fn().mockReturnThis();
         (mockScale as any).range = jest.fn().mockReturnThis();
         mockContext.config.color = mockScale as any;
         mockContext.config.colour = 'category'; // Set color field to category

         // Test data without sector but with category
         const dataWithoutSector = { name: 'Test', value: 50, category: 'TestCat' } as any;
         const processedData = createProcessedDataPoint(dataWithoutSector, { colorField: 'category' });
         const layoutNode: LayoutNode = {
           x: 100,
           y: 100,
           r: 20,
           data: processedData
         };
         
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(mockScale).toHaveBeenCalledWith('TestCat');
         expect(result).toBe('scale-color-TestCat');
       });

       it('should fallback to index string when no sector or category available', () => {
         const mockScale = jest.fn((key: string) => `scale-color-${key}`);
         // Add D3 scale properties to make it identifiable as a scale
         (mockScale as any).domain = jest.fn().mockReturnThis();
         (mockScale as any).range = jest.fn().mockReturnThis();
         mockContext.config.color = mockScale as any;

         // Test data without sector or category
         const dataMinimal = { name: 'Test', value: 50 } as any;
         const layoutNode = createLayoutNode(dataMinimal, 5);
         
         const result = (pipeline as any).getCircleColor(layoutNode, 5);

         expect(mockScale).toHaveBeenCalledWith('5');
         expect(result).toBe('scale-color-5');
       });
     });

         describe('Default color fallback', () => {
       it('should return default color when no color config provided', () => {
         // No color configuration
         delete (mockContext.config as any).color;

         const layoutNode = createLayoutNode(testData[0]!, 0);
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(result).toBe('#ddd');
       });

       it('should use custom default color', () => {
         delete (mockContext.config as any).color;
         mockContext.config.defaultColor = '#custom';

         const layoutNode = createLayoutNode(testData[0]!, 0);
         const result = (pipeline as any).getCircleColor(layoutNode, 0);

         expect(result).toBe('#custom');
       });
    });

    describe('Real-world scenarios', () => {
      it('should handle Fortune 1000 company data structure', () => {
        interface CompanyData {
          id: string;
          name: string;
          sector: string;
          profits: number;
        }

        const companyData: CompanyData = {
          id: 'company-1',
          name: 'Apple',
          sector: 'Technology',
          profits: 96995
        };

                 const sectorColors: Record<string, string> = {
           'Technology': '#3498db',
           'Health Care': '#2ecc71',
           'Retailing': '#e74c3c',
           'Financials': '#f39c12',
           'Energy': '#9b59b6'
         };

         const colorFn = (d: CompanyData) => sectorColors[d.sector] || '#999';
         mockContext.config.color = colorFn as any;

        const processedData: ProcessedDataPoint<CompanyData> = {
          data: companyData,
          label: companyData.name,
          size: companyData.profits
        };

        const layoutNode: LayoutNode = {
          x: 100,
          y: 100,
          r: 20,
          data: processedData
        };

        const result = (pipeline as any).getCircleColor(layoutNode, 0);
        expect(result).toBe('#3498db');
      });

      it('should handle streaming data with dynamic color assignment', () => {
        const streamingColorFn = jest.fn((d: TestData) => {
          // Simulate dynamic color assignment based on data properties
          if (d.value > 85) return '#green';
          if (d.value > 75) return '#yellow';
          return '#red';
        });

                 mockContext.config.color = streamingColorFn as any;

         testData.forEach((data, index) => {
           const layoutNode = createLayoutNode(data, index);
           const result = (pipeline as any).getCircleColor(layoutNode, index);
           
           let expectedColor;
           if (data.value > 85) expectedColor = '#green';
           else if (data.value > 75) expectedColor = '#yellow';
           else expectedColor = '#red';

           expect(result).toBe(expectedColor);
         });
       });
     });
   });

   describe('Data Structure Handling', () => {
     it('should correctly extract original data from ProcessedDataPoint', () => {
       const colorFn = jest.fn((d: TestData) => d.name);
       mockContext.config.color = colorFn as any;

       const processedData: ProcessedDataPoint<TestData> = {
         data: testData[0]!,
         label: 'processed-label',
         size: 999
       };

       const layoutNode: LayoutNode = {
         x: 100,
         y: 100,
         r: 20,
         data: processedData
       };

       (pipeline as any).getCircleColor(layoutNode, 0);

       // Should pass the original data, not the processed wrapper
       expect(colorFn).toHaveBeenCalledWith(testData[0]!);
     });

     it('should handle undefined data gracefully', () => {
       const colorFn = jest.fn((d: TestData | undefined) => d?.name || 'unknown');
       mockContext.config.color = colorFn as any;

      const layoutNode: LayoutNode = {
        x: 100,
        y: 100,
        r: 20,
        data: undefined as any
      };

      const result = (pipeline as any).getCircleColor(layoutNode, 0);
      
      expect(colorFn).toHaveBeenCalledWith(undefined);
      expect(result).toBe('unknown');
    });
  });
}); 