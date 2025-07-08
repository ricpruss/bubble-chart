/**
 * D3-Native Data Processing Utilities
 * Centralized data handling using D3's native patterns to eliminate duplication
 * Replaces DataProcessor and custom data processing across all builders
 */

import * as d3 from 'd3';
// No imports from old data types - D3DataUtils is completely generic!

/**
 * Processed data point using D3-native patterns (simplified)
 * Generic type accepts any object, not just BubbleChartData
 */
export interface D3ProcessedData<T = any> {
  /** Original data item */
  data: T;
  /** Extracted label value */
  label: string;
  /** Extracted size value */
  size: number;
  /** Extracted color key (optional) */
  colorValue?: string;
  /** Extracted time value (optional) */
  time?: number;
  /** Calculated percentage (optional) */
  percentage?: number;
}

/**
 * D3-native data processing utilities
 * Leverages d3-array, d3-scale, and d3-format for cleaner data handling
 */
export class D3DataUtils {
  /**
   * Extract values using D3's native accessor pattern
   * @param accessor - String property name or function accessor
   * @returns Accessor function
   */
  static createAccessor<T>(accessor: string | ((d: T) => any)): (d: T) => any {
    return typeof accessor === 'function' ? accessor : (d: T) => (d as any)[accessor];
  }

  /**
   * Create radius scale using D3's native scale patterns (sqrt for better area representation)
   * @param data - Data array to calculate domain from
   * @param sizeAccessor - Function to extract size values
   * @param range - Output range [min, max]
   * @returns D3 square root scale
   */
  static createRadiusScale(
    data: any[], 
    sizeAccessor: (d: any) => number, 
    range: [number, number] = [5, 50]
  ): d3.ScalePower<number, number> {
    const extent = d3.extent(data, sizeAccessor) as [number, number];
    return d3.scaleSqrt()
      .domain([0, extent[1] || 1]) // Start from 0 for better visual scaling
      .range(range)
      .clamp(true);
  }

  /**
   * Create color scale using D3's native ordinal patterns
   * @param colorValues - Array of unique color values from data
   * @param colorScheme - D3 color scheme (default: Category10)
   * @returns D3 ordinal color scale
   */
  static createColorScale(
    colorValues: string[], 
    colorScheme: readonly string[] = d3.schemeCategory10
  ): d3.ScaleOrdinal<string, string> {
    return d3.scaleOrdinal<string, string>()
      .domain(colorValues)
      .range(colorScheme);
  }

  /**
   * Create font size scale based on radius using D3's linear scale
   * @param radiusRange - Range of radius values [min, max]
   * @param fontRange - Desired font size range [min, max]
   * @returns D3 linear scale for font sizing
   */
  static createFontScale(
    radiusRange: [number, number],
    fontRange: [number, number] = [10, 20]
  ): d3.ScaleLinear<number, number> {
    return d3.scaleLinear()
      .domain(radiusRange)
      .range(fontRange)
      .clamp(true);
  }

  /**
   * Process data using D3's native patterns - replaces DataProcessor
   * Enhanced to handle ANY data types and accessors consistently
   * No longer tied to BubbleChartData - works with any object structure
   * @param data - Raw data array (any object structure)
   * @param labelAccessor - Label accessor (string property name, array of properties, or function)
   * @param sizeAccessor - Size accessor (string property name, array of properties, or function)
   * @param colorAccessor - Optional color accessor
   * @param timeAccessor - Optional time accessor
   * @param percentageAccessor - Optional percentage accessor
   * @returns Processed data points with extracted values
   */
  static processForVisualization<T = any>(
    data: T[],
    labelAccessor: string | string[] | ((d: T) => string),
    sizeAccessor: string | string[] | ((d: T) => number),
    colorAccessor?: string | string[] | ((d: T) => string),
    timeAccessor?: string | string[] | ((d: T) => number),
    percentageAccessor?: boolean | ((d: T) => number)
  ): D3ProcessedData<T>[] {
    if (!data || data.length === 0) {
      return [];
    }

    // Normalize accessors - handle array accessors by taking the first valid one
    const finalLabelAccessor = this.normalizeAccessor(labelAccessor, 'label');
    const finalSizeAccessor = this.normalizeAccessor(sizeAccessor, 'size');
    const finalColorAccessor = colorAccessor ? this.normalizeAccessor(colorAccessor, 'category') : null;
    const finalTimeAccessor = timeAccessor ? this.normalizeAccessor(timeAccessor, 'time') : null;

    // Create accessor functions using D3 patterns
    const getLabelValue = this.createAccessor<T>(finalLabelAccessor);
    const getSizeValue = this.createAccessor<T>(finalSizeAccessor);
    const getColorValue = finalColorAccessor ? this.createAccessor<T>(finalColorAccessor) : null;
    const getTimeValue = finalTimeAccessor ? this.createAccessor<T>(finalTimeAccessor) : null;

    return data.map(d => {
      const result: D3ProcessedData<T> = {
        data: d,
        label: String(getLabelValue(d) || 'Unknown'),
        size: Math.max(0, Number(getSizeValue(d) || 1)) // Ensure positive size
      };

      // Extract optional values
      if (getColorValue) {
        result.colorValue = String(getColorValue(d) || 'default');
      }

      if (getTimeValue) {
        result.time = Number(getTimeValue(d) || 0);
      }

      if (percentageAccessor) {
        if (typeof percentageAccessor === 'function') {
          result.percentage = Math.max(0, Math.min(1, percentageAccessor(d))); // Clamp 0-1
        } else {
          result.percentage = 0.7; // Default visual value
        }
      }

      return result;
    });
  }

  /**
   * Sort processed data using D3's native sorting
   * @param data - Processed data array
   * @param sortBy - Property to sort by ('size', 'label', 'time')
   * @param order - Sort order ('asc' or 'desc')
   * @returns Sorted data array
   */
  static sortData<T = any>(
    data: D3ProcessedData<T>[],
    sortBy: 'size' | 'label' | 'time' = 'size',
    order: 'asc' | 'desc' = 'desc'
  ): D3ProcessedData<T>[] {
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'time':
          comparison = (a.time || 0) - (b.time || 0);
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get unique values for a property using D3's native patterns
   * @param data - Processed data array
   * @param property - Property to extract unique values from
   * @returns Array of unique values
   */
  static getUniqueValues<T = any>(
    data: D3ProcessedData<T>[],
    property: keyof D3ProcessedData<T>
  ): any[] {
    const values = data.map(d => d[property]).filter(v => v != null);
    return [...new Set(values)];
  }

  /**
   * Create D3-native pack layout for bubble positioning
   * Replaces RenderingPipeline.createBubblePackLayout()
   * @param data - Processed data array
   * @param width - Container width
   * @param height - Container height
   * @param padding - Bubble padding (default: 5)
   * @returns Array of layout nodes with x, y, r positions
   */
  static createPackLayout<T = any>(
    data: D3ProcessedData<T>[],
    width: number,
    height: number,
    padding: number = 5
  ): Array<{ x: number; y: number; r: number; data: D3ProcessedData<T> }> {
    // Create pack layout using D3's native patterns
    const pack = d3.pack()
      .size([width, height])
      .padding(padding);

    // Create hierarchy for pack layout
    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.size || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Apply pack layout
    const nodes = pack(root).descendants().slice(1); // Skip root node

    return nodes.map(node => ({
      x: node.x,
      y: node.y,
      r: node.r,
      data: node.data as D3ProcessedData<T>
    }));
  }

  /**
   * Create D3-native hierarchical pack layout for tree structures
   * Replaces RenderingPipeline.createHierarchicalLayout()
   * @param hierarchyData - Nested data structure
   * @param width - Container width
   * @param height - Container height
   * @param padding - Node padding (default: 5)
   * @returns Array of layout nodes with nested structure
   */
  static createHierarchyLayout(
    hierarchyData: any,
    width: number,
    height: number,
    padding: number = 5
  ): Array<{ x: number; y: number; r: number; data: any; depth: number; parent: any | null }> {
    const pack = d3.pack()
      .size([width, height])
      .padding(padding);

    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.size || d.amount || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const nodes = pack(root).descendants();

    return nodes.map(node => ({
      x: node.x,
      y: node.y,
      r: node.r,
      data: node.data,
      depth: node.depth,
      parent: node.parent?.data || null
    }));
  }

  /**
   * Calculate statistics using D3's native math functions
   * @param data - Processed data array
   * @returns Statistics object
   */
  static calculateSizeStats<T = any>(
    data: D3ProcessedData<T>[]
  ): {
    min: number;
    max: number;
    mean: number;
    median: number;
    extent: [number, number];
  } {
    const sizes = data.map(d => d.size);
    
    return {
      min: d3.min(sizes) || 0,
      max: d3.max(sizes) || 0,
      mean: d3.mean(sizes) || 0,
      median: d3.median(sizes) || 0,
      extent: d3.extent(sizes) as [number, number] || [0, 0]
    };
  }


  /**
   * Normalize accessor to handle arrays and provide fallbacks
   * @private
   */
  private static normalizeAccessor(
    accessor: string | string[] | ((d: any) => any),
    fallback: string
  ): string | ((d: any) => any) {
    if (Array.isArray(accessor)) {
      // Return a function that tries each property in the array until one exists
      return (d: any) => {
        for (const prop of accessor) {
          if (d && d[prop] !== undefined && d[prop] !== null) {
            return d[prop];
          }
        }
        // If none found, try fallback
        return d && d[fallback] !== undefined && d[fallback] !== null ? d[fallback] : undefined;
      };
    }
    return accessor || fallback;
  }

  /**
   * Format labels using D3's formatting utilities
   * @param label - Original label
   * @param maxLength - Maximum length (optional)
   * @returns Formatted label
   */
  static formatLabel(label: string, maxLength?: number): string {
    if (maxLength && label.length > maxLength) {
      return label.substring(0, maxLength - 1) + '…';
    }
    return label;
  }

  /**
   * Format numbers using D3's format function
   * @param value - Number to format
   * @param format - D3 format specifier (default: '.2s' for SI prefix)
   * @returns Formatted number string
   */
  static formatNumber(value: number, format: string = '.2s'): string {
    return d3.format(format)(value);
  }

  /**
   * Format dates using D3's time format
   * @param date - Date to format
   * @param format - D3 time format specifier (default: '%Y-%m-%d')
   * @returns Formatted date string
   */
  static formatDate(date: Date, format: string = '%Y-%m-%d'): string {
    return d3.timeFormat(format)(date);
  }
}
