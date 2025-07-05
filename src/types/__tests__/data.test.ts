/**
 * Test suite for data type definitions
 * Validates type guards, utilities, and data structure handling
 */

import {
  type FlatBubbleData,
  type HierarchicalBubbleData,
  type TimeSeriesBubbleData,
  isFlatBubbleData,
  isHierarchicalBubbleData,
  isTimeSeriesBubbleData,
  isFlatDataArray,
  isHierarchicalData,
  isTimeSeriesDataArray,
  getNumericValue,
  getStringValue
} from '../data.js';

describe('Data Type Guards', () => {
  describe('isFlatBubbleData', () => {
    it('should return true for valid flat bubble data', () => {
      const validData: FlatBubbleData = {
        label: 'Test Company',
        size: 1000,
        count: 50,
        type: 'Technology',
        year: 2023
      };
      
      expect(isFlatBubbleData(validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isFlatBubbleData(null)).toBe(false);
      expect(isFlatBubbleData(undefined)).toBe(false);
      expect(isFlatBubbleData({ label: 'test' })).toBe(false); // missing size
      expect(isFlatBubbleData({ size: 100 })).toBe(false); // missing label
      expect(isFlatBubbleData({ label: 123, size: 'invalid' })).toBe(false); // wrong types
    });

    it('should handle minimal valid data', () => {
      const minimalData = { label: 'Test', size: 100 };
      expect(isFlatBubbleData(minimalData)).toBe(true);
    });
  });

  describe('isHierarchicalBubbleData', () => {
    it('should return true for valid hierarchical data', () => {
      const validData: HierarchicalBubbleData = {
        name: 'root',
        label: 'Root Node',
        year: 2023,
        children: [
          {
            name: 'child1',
            label: 'Child 1',
            amount: 500
          }
        ]
      };
      
      expect(isHierarchicalBubbleData(validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isHierarchicalBubbleData(null)).toBe(false);
      expect(isHierarchicalBubbleData({})).toBe(false);
      expect(isHierarchicalBubbleData({ name: 'test' })).toBe(false); // missing label
      expect(isHierarchicalBubbleData({ label: 'test' })).toBe(false); // missing name
    });

    it('should handle leaf nodes without children', () => {
      const leafNode = { name: 'leaf', label: 'Leaf Node', amount: 100 };
      expect(isHierarchicalBubbleData(leafNode)).toBe(true);
    });
  });

  describe('isTimeSeriesBubbleData', () => {
    it('should return true for valid time series data', () => {
      const validData: TimeSeriesBubbleData = {
        name: 'Technology',
        values: [
          { year: 2023, month: 1, complaints: 117, investigations: 24 },
          { year: 2023, month: 2, complaints: 119, investigations: 103 }
        ]
      };
      
      expect(isTimeSeriesBubbleData(validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isTimeSeriesBubbleData(null)).toBe(false);
      expect(isTimeSeriesBubbleData({})).toBe(false);
      expect(isTimeSeriesBubbleData({ name: 'test' })).toBe(false); // missing values
      expect(isTimeSeriesBubbleData({ values: [] })).toBe(false); // missing name
      expect(isTimeSeriesBubbleData({ name: 'test', values: 'invalid' })).toBe(false); // values not array
    });
  });

  describe('Array type guards', () => {
    it('should correctly identify flat data arrays', () => {
      const flatArray: FlatBubbleData[] = [
        { label: 'A', size: 100 },
        { label: 'B', size: 200 }
      ];
      
      expect(isFlatDataArray(flatArray)).toBe(true);
      expect(isFlatDataArray([])).toBe(false); // empty array
      expect(isFlatDataArray([{ name: 'invalid' }])).toBe(false);
    });

    it('should correctly identify hierarchical data', () => {
      const hierarchicalData: HierarchicalBubbleData = {
        name: 'root',
        label: 'Root',
        children: []
      };
      
      expect(isHierarchicalData(hierarchicalData)).toBe(true);
      expect(isHierarchicalData({ label: 'test', size: 100 })).toBe(false);
    });

    it('should correctly identify time series arrays', () => {
      const timeSeriesArray: TimeSeriesBubbleData[] = [
        { name: 'Tech', values: [{ year: 2023, month: 1 }] },
        { name: 'Health', values: [{ year: 2023, month: 2 }] }
      ];
      
      expect(isTimeSeriesDataArray(timeSeriesArray)).toBe(true);
      expect(isTimeSeriesDataArray([])).toBe(false); // empty array
    });
  });
});

describe('Utility Functions', () => {
  describe('getNumericValue', () => {
    const testData = { size: 100, count: 50, nested: { value: 75 } };

    it('should extract numeric values using property keys', () => {
      expect(getNumericValue(testData, 'size')).toBe(100);
      expect(getNumericValue(testData, 'count')).toBe(50);
    });

    it('should extract numeric values using accessor functions', () => {
      const accessor = (d: typeof testData) => d.size * 2;
      expect(getNumericValue(testData, accessor)).toBe(200);
    });

    it('should return 0 for non-numeric values', () => {
      expect(getNumericValue(testData, 'nonexistent' as keyof typeof testData)).toBe(0);
    });

    it('should handle complex accessor functions', () => {
      const complexAccessor = (d: typeof testData) => d.size + d.count;
      expect(getNumericValue(testData, complexAccessor)).toBe(150);
    });
  });

  describe('getStringValue', () => {
    const testData = { label: 'Test', type: 'Company', count: 100 };

    it('should extract string values using property keys', () => {
      expect(getStringValue(testData, 'label')).toBe('Test');
      expect(getStringValue(testData, 'type')).toBe('Company');
    });

    it('should extract string values using accessor functions', () => {
      const accessor = (d: typeof testData) => `${d.label} - ${d.type}`;
      expect(getStringValue(testData, accessor)).toBe('Test - Company');
    });

    it('should convert non-string values to strings', () => {
      expect(getStringValue(testData, 'count')).toBe('100');
    });

    it('should handle undefined/null values', () => {
      expect(getStringValue(testData, 'nonexistent' as keyof typeof testData)).toBe('');
    });

    it('should handle complex transformations', () => {
      const transformAccessor = (d: typeof testData) => d.label.toUpperCase();
      expect(getStringValue(testData, transformAccessor)).toBe('TEST');
    });
  });
});

describe('Real-world Data Compatibility', () => {
  it('should handle company dataset structure', () => {
    const companyData = {
      label: '3M',
      size: 2293236972,
      count: 57,
      type: 'Companies',
      year: 2021
    };
    
    expect(isFlatBubbleData(companyData)).toBe(true);
    expect(getStringValue(companyData, 'label')).toBe('3M');
    expect(getNumericValue(companyData, 'size')).toBe(2293236972);
  });

  it('should handle tech hierarchy dataset structure', () => {
    const techData = {
      name: 'flare',
      label: 'flare',
      year: 2018,
      children: [
        {
          name: 'analytics',
          label: 'analytics',
          year: 2019,
          children: [
            { name: 'AgglomerativeCluster', label: 'AgglomerativeCluster', amount: 3938, year: 2021 }
          ]
        }
      ]
    };
    
    expect(isHierarchicalBubbleData(techData)).toBe(true);
    expect(getStringValue(techData, 'name')).toBe('flare');
  });

  it('should handle sector complaints dataset structure', () => {
    const sectorData = {
      name: 'Technology',
      values: [
        {
          year: 2023,
          month: 1,
          complaints: 117,
          investigations: 24
        }
      ]
    };
    
    expect(isTimeSeriesBubbleData(sectorData)).toBe(true);
    expect(getStringValue(sectorData, 'name')).toBe('Technology');
  });

  it('should handle mixed data arrays', () => {
    const mixedArray = [
      { label: 'Company', size: 100 },
      { name: 'TimeSeries', values: [{ year: 2023 }] }
    ];
    
    // Should not match single type arrays
    expect(isFlatDataArray(mixedArray)).toBe(false);
    expect(isTimeSeriesDataArray(mixedArray)).toBe(false);
  });
});

describe('Type Safety Edge Cases', () => {
  it('should handle empty objects', () => {
    const emptyObj = {};
    expect(isFlatBubbleData(emptyObj)).toBe(false);
    expect(isHierarchicalBubbleData(emptyObj)).toBe(false);
    expect(isTimeSeriesBubbleData(emptyObj)).toBe(false);
  });

  it('should handle objects with null values', () => {
    const nullData = { label: null, size: null };
    expect(isFlatBubbleData(nullData)).toBe(false);
  });

  it('should handle objects with wrong types', () => {
    const wrongTypes = { label: 123, size: 'string' };
    expect(isFlatBubbleData(wrongTypes)).toBe(false);
  });

  it('should handle deeply nested invalid structures', () => {
    const invalidNested = {
      name: 'test',
      label: 'test',
      children: [
        { name: 'child' } // missing label
      ]
    };
    
    // Type guard only checks top level
    expect(isHierarchicalBubbleData(invalidNested)).toBe(true);
  });

  it('should handle accessor functions with edge cases', () => {
    const edgeCaseData = { value: null, text: undefined };
    
    expect(getNumericValue(edgeCaseData, 'value')).toBe(0);
    expect(getStringValue(edgeCaseData, 'text')).toBe('');
    
    // Test with accessor that might throw
    const safeAccessor = (d: typeof edgeCaseData) => {
      try {
        return String(d.value) || '';
      } catch {
        return '';
      }
    };
    
    expect(getStringValue(edgeCaseData, safeAccessor)).toBe('null');
  });
}); 