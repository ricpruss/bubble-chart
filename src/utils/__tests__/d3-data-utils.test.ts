/**
 * Tests for D3DataUtils
 * Comprehensive testing of D3-native data processing utilities
 */

import { D3DataUtils, type D3ProcessedData } from '../d3-data-utils.js';

// Test data structures - completely generic, no dependency on BubbleChartData!
interface TestCompany {
  name: string;
  revenue: number;
  employees: number;
  sector: string;
  founded?: number;
  profitable?: boolean;
}

const testData: TestCompany[] = [
  { name: 'Apple', revenue: 394000, employees: 164000, sector: 'Technology', founded: 1976, profitable: true },
  { name: 'Microsoft', revenue: 198000, employees: 221000, sector: 'Technology', founded: 1975, profitable: true },
  { name: 'Amazon', revenue: 513983, employees: 1540000, sector: 'E-commerce', founded: 1994, profitable: true },
  { name: 'Walmart', revenue: 611289, employees: 2300000, sector: 'Retail', founded: 1962, profitable: true },
  { name: 'Tesla', revenue: 96773, employees: 127855, sector: 'Automotive', founded: 2003, profitable: true }
];

describe('D3DataUtils', () => {
  describe('createAccessor', () => {
    it('should create string accessor', () => {
      const accessor = D3DataUtils.createAccessor<TestCompany>('name');
      expect(accessor(testData[0]!)).toBe('Apple');
    });

    it('should handle function accessor', () => {
      const accessor = D3DataUtils.createAccessor<TestCompany>((d) => d.revenue / 1000);
      expect(accessor(testData[0]!)).toBe(394);
    });

    it('should handle missing properties gracefully', () => {
      const accessor = D3DataUtils.createAccessor<TestCompany>('nonexistent' as any);
      expect(accessor(testData[0]!)).toBeUndefined();
    });
  });

  describe('createRadiusScale', () => {
    it('should create a sqrt scale with correct domain and range', () => {
      const scale = D3DataUtils.createRadiusScale(
        testData,
        (d) => d.revenue,
        [5, 50]
      );
      
      expect(scale.domain()).toEqual([0, 611289]);
      expect(scale.range()).toEqual([5, 50]);
    });

    it('should handle empty data', () => {
      const scale = D3DataUtils.createRadiusScale([], (d) => d.value, [5, 50]);
      expect(scale.domain()).toEqual([0, 1]); // Fallback domain
    });

    it('should clamp values outside domain', () => {
      const scale = D3DataUtils.createRadiusScale(testData, (d) => d.revenue, [5, 50]);
      expect(scale(-1000)).toBe(5); // Should clamp to min
      expect(scale(1000000)).toBe(50); // Should clamp to max
    });
  });

  describe('createColorScale', () => {
    it('should create ordinal scale with unique domains', () => {
      const colorValues = ['Technology', 'E-commerce', 'Retail', 'Automotive'];
      const scale = D3DataUtils.createColorScale(colorValues);
      
      expect(scale.domain()).toEqual(colorValues);
      expect(scale('Technology')).toBeTruthy();
      expect(scale('E-commerce')).toBeTruthy();
    });

    it('should use Category10 scheme by default', () => {
      const scale = D3DataUtils.createColorScale(['A', 'B']);
      expect(scale('A')).toBe('#1f77b4'); // First color in Category10
    });
  });

  describe('createFontScale', () => {
    it('should create linear scale for font sizes', () => {
      const scale = D3DataUtils.createFontScale([5, 50], [10, 24]);
      
      expect(scale.domain()).toEqual([5, 50]);
      expect(scale.range()).toEqual([10, 24]);
      expect(scale(27.5)).toBe(17); // Midpoint
    });
  });

  describe('processForVisualization', () => {
    it('should process data with string accessors', () => {
      const processed = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue'
      );

      expect(processed).toHaveLength(5);
      expect(processed[0]).toEqual({
        data: testData[0],
        label: 'Apple',
        size: 394000
      });
    });

    it('should process data with function accessors', () => {
      const processed = D3DataUtils.processForVisualization(
        testData,
        (d: TestCompany) => d.name.toUpperCase(),
        (d: TestCompany) => d.employees / 1000
      );

      expect(processed[0]).toEqual({
        data: testData[0],
        label: 'APPLE',
        size: 164
      });
    });

    it('should handle color accessor', () => {
      const processed = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue',
        'sector'
      );

      expect(processed[0]?.colorValue).toBe('Technology');
      expect(processed[2]?.colorValue).toBe('E-commerce');
    });

    it('should handle array accessors', () => {
      const processed = D3DataUtils.processForVisualization(
        testData,
        ['title', 'name'], // title doesn't exist, should fall back to name
        ['turnover', 'revenue'] // turnover doesn't exist, should fall back to revenue
      );

      expect(processed[0]?.label).toBe('Apple');
      expect(processed[0]?.size).toBe(394000);
    });

    it('should handle percentage accessor', () => {
      const processed = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue',
        undefined,
        undefined,
        (d: TestCompany) => d.profitable ? 0.8 : 0.2
      );

      expect(processed[0]?.percentage).toBe(0.8);
    });

    it('should handle empty data', () => {
      const processed = D3DataUtils.processForVisualization([], 'name', 'value');
      expect(processed).toEqual([]);
    });

    it('should ensure positive sizes', () => {
      const negativeData = [{ name: 'Test', value: -100 }];
      const processed = D3DataUtils.processForVisualization(
        negativeData,
        'name',
        'value'
      );

      expect(processed[0]?.size).toBe(0); // Should be clamped to 0
    });
  });

  describe('sortData', () => {
    let processedData: D3ProcessedData<TestCompany>[];

    beforeEach(() => {
      processedData = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue'
      );
    });

    it('should sort by size descending by default', () => {
      const sorted = D3DataUtils.sortData(processedData);
      expect(sorted[0]?.label).toBe('Walmart'); // Highest revenue
      expect(sorted[4]?.label).toBe('Tesla'); // Lowest revenue
    });

    it('should sort by size ascending', () => {
      const sorted = D3DataUtils.sortData(processedData, 'size', 'asc');
      expect(sorted[0]?.label).toBe('Tesla'); // Lowest revenue
      expect(sorted[4]?.label).toBe('Walmart'); // Highest revenue
    });

    it('should sort by label', () => {
      const sorted = D3DataUtils.sortData(processedData, 'label', 'asc');
      expect(sorted[0]?.label).toBe('Amazon');
      expect(sorted[4]?.label).toBe('Walmart');
    });
  });

  describe('getUniqueValues', () => {
    it('should extract unique color values', () => {
      const processedData = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue',
        'sector'
      );

      const uniqueColors = D3DataUtils.getUniqueValues(processedData, 'colorValue');
      expect(uniqueColors).toEqual(['Technology', 'E-commerce', 'Retail', 'Automotive']);
    });

    it('should handle properties with undefined values', () => {
      const processedData = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue'
      );

      const uniqueColors = D3DataUtils.getUniqueValues(processedData, 'colorValue');
      expect(uniqueColors).toEqual([]); // No color values provided
    });
  });

  describe('calculateSizeStats', () => {
    it('should calculate correct statistics', () => {
      const processedData = D3DataUtils.processForVisualization(
        testData,
        'name',
        'revenue'
      );

      const stats = D3DataUtils.calculateSizeStats(processedData);
      
      expect(stats.min).toBe(96773);
      expect(stats.max).toBe(611289);
      expect(stats.mean).toBeCloseTo(362809);
      expect(stats.extent).toEqual([96773, 611289]);
    });
  });

  describe('createPackLayout', () => {
    it('should create bubble pack layout', () => {
      const processedData = D3DataUtils.processForVisualization(
        testData.slice(0, 3), // Use fewer items for testing
        'name',
        'revenue'
      );

      const layout = D3DataUtils.createPackLayout(processedData, 400, 300, 2);
      
      expect(layout).toHaveLength(3);
      expect(layout[0]).toHaveProperty('x');
      expect(layout[0]).toHaveProperty('y');
      expect(layout[0]).toHaveProperty('r');
      expect(layout[0]).toHaveProperty('data');
      
      // Positions should be within bounds
      layout.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(400);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(300);
      });
    });
  });

  describe('createHierarchyLayout', () => {
    it('should create hierarchical layout', () => {
      const hierarchicalData = {
        name: 'root',
        children: [
          { name: 'A', size: 100 },
          { name: 'B', size: 200, children: [
            { name: 'B1', size: 50 },
            { name: 'B2', size: 75 }
          ]}
        ]
      };

      const layout = D3DataUtils.createHierarchyLayout(hierarchicalData, 400, 300);
      
      expect(layout.length).toBeGreaterThan(1);
      expect(layout[0]?.depth).toBe(0); // Root node
      
      const leafNodes = layout.filter(node => node.depth > 0);
      expect(leafNodes.length).toBeGreaterThan(0);
    });
  });

  describe('formatting functions', () => {
    it('should format labels with truncation', () => {
      expect(D3DataUtils.formatLabel('Long Company Name', 10)).toBe('Long Comp…');
      expect(D3DataUtils.formatLabel('Short', 10)).toBe('Short');
    });

    it('should format numbers with D3 format', () => {
      expect(D3DataUtils.formatNumber(1234567)).toBe('1.2M');
      expect(D3DataUtils.formatNumber(1234, '.0f')).toBe('1234');
    });

    it('should format dates with D3 time format', () => {
      const date = new Date('2023-01-15T12:00:00Z'); // Use explicit UTC time
      expect(D3DataUtils.formatDate(date)).toBe('2023-01-15');
      expect(D3DataUtils.formatDate(date, '%m/%d/%Y')).toBe('01/15/2023');
    });
  });
});
