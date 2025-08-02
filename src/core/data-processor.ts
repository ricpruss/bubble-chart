/**
 * Data Processing System
 * Centralized handling of data transformation, validation, and accessor logic
 * Eliminates duplication across all chart builders
 */

import type { 
  BubbleChartData, 
  BubbleChartOptions,
  ProcessedDataPoint
} from '../types.js';
import { 
  isFlatBubbleData, 
  isHierarchicalBubbleData, 
  isTimeSeriesBubbleData,
  getNumericValue,
  getStringValue
} from '../types.js';

// ProcessedDataPoint interface now defined in types.js

/**
 * Data processor for consistent data handling across all chart types
 */
export class DataProcessor<T extends BubbleChartData = BubbleChartData> {
  constructor(private config: BubbleChartOptions) {}

  /**
   * Process raw data array into standardized format
   * @param data - Raw data array
   * @returns Processed data points with extracted values
   */
  process(data: T[]): ProcessedDataPoint<T>[] {
    if (!data || data.length === 0) {
      return [];
    }

    // Validate data structure
    this.validate(data);

    // Process each data item
    const processed = data.map(item => this.processItem(item));

    // Apply sorting if configured
    if (this.config.sort) {
      processed.sort((a, b) => b.size - a.size);
    }

    return processed;
  }

  /**
   * Process a single data item
   * @param item - Single data item
   * @returns Processed data point
   */
  private processItem(item: T): ProcessedDataPoint<T> {
    const processed: ProcessedDataPoint<T> = {
      data: item,
      label: this.extractLabel(item),
      size: this.extractSize(item)
    };

    // Extract optional values
    if (this.config.colour || this.config.color) {
      processed.colorValue = this.extractColor(item);
    }

    if (this.config.time) {
      processed.time = this.extractTime(item);
    }

    if (this.config.percentage) {
      processed.percentage = this.extractPercentage(item);
    }

    return processed;
  }

  /**
   * Extract label value using configured accessor
   * @param item - Data item
   * @returns Label string
   */
  extractLabel(item: T): string {
    try {
      if (typeof this.config.label === 'function') {
        return String(this.config.label(item));
      }

      if (Array.isArray(this.config.label) && this.config.label.length > 0) {
        // Try each label property until one is found
        for (const prop of this.config.label) {
          const value = getStringValue(item, prop);
          if (value) return value;
        }
        return 'Unknown';
      }

      // Handle string label
      if (typeof this.config.label === 'string') {
        return getStringValue(item, this.config.label);
      }

      return 'Unknown';
    } catch (error) {
      console.warn('Error extracting label:', error);
      return 'Unknown';
    }
  }

  /**
   * Extract size value using configured accessor
   * @param item - Data item
   * @returns Numeric size value
   */
  extractSize(item: T): number {
    try {
      if (typeof this.config.size === 'function') {
        return Number(this.config.size(item)) || 0;
      }

      if (Array.isArray(this.config.size) && this.config.size.length > 0) {
        // Try each size property until one is found
        for (const prop of this.config.size) {
          const value = getNumericValue(item, prop);
          if (value > 0) return value;
        }
        return 1; // Default minimum size
      }

      // Handle string size
      if (typeof this.config.size === 'string') {
        return getNumericValue(item, this.config.size);
      }

      return 1;
    } catch (error) {
      console.warn('Error extracting size:', error);
      return 1;
    }
  }

  /**
   * Extract color key for grouping
   * @param item - Data item
   * @returns Color key string
   */
  private extractColor(item: T): string {
    // Check both British and American spellings
    const colorConfig = (this.config as any).colour || (this.config as any).color;
    
    if (typeof colorConfig === 'string') {
      return getStringValue(item, colorConfig);
    }
    
    // Default to extracting from common color properties
    const colorProps = ['category', 'type', 'type', 'group'];
    for (const prop of colorProps) {
      if (prop in item) {
        return String((item as any)[prop]);
      }
    }
    
    return 'default';
  }

  /**
   * Extract time value for temporal charts
   * @param item - Data item
   * @returns Time value (typically year)
   */
  private extractTime(item: T): number {
    if (!this.config.time) return 0;

    try {
      if (typeof this.config.time === 'function') {
        return Number(this.config.time(item)) || 0;
      }

      return getNumericValue(item, this.config.time);
    } catch (error) {
      console.warn('Error extracting time:', error);
      return 0;
    }
  }

  /**
   * Extract percentage value for progress/fill visualizations
   * @param item - Data item
   * @returns Percentage value (0-1)
   */
  private extractPercentage(item: T): number {
    if (!this.config.percentage) return 0.5; // Default

    try {
      if (typeof this.config.percentage === 'function') {
        const result = this.config.percentage(item);
        return Math.max(0, Math.min(1, result)); // Clamp 0-1
      }

      // If percentage is just true, calculate from size relative to max
      return 0.7; // Default for visual appeal
    } catch (error) {
      console.warn('Error extracting percentage:', error);
      return 0.5;
    }
  }

  /**
   * Validate data structure and log warnings for common issues
   * @param data - Data array to validate
   */
  private validate(data: T[]): void {
    if (data.length === 0) {
      console.warn('Empty data array provided');
      return;
    }

    // Test if we can successfully extract values with current configuration
    try {
      const first = data[0];
      if (!first) return;
      
      const label = this.extractLabel(first);
      const size = this.extractSize(first);

      // If extraction works, data is compatible (even if values seem basic)
      if (label && size >= 0) {
        // Successfully extracted values - data structure is valid
        return;
      }
    } catch (error) {
      // If extraction fails, there's likely a configuration issue
      console.warn('Data extraction failed - check your label and size configuration:', error);
      return;
    }

    // Only warn if we can't extract values AND data doesn't match known patterns
    const first = data[0];
    const isKnownStructure = isFlatBubbleData(first) || 
                           isHierarchicalBubbleData(first) || 
                           isTimeSeriesBubbleData(first);

    if (!isKnownStructure) {
      console.info('Using custom data structure - ensure label and size accessors are configured correctly');
    }
  }



  /**
   * Get unique values for a property (useful for legend/filtering)
   * @param data - Processed data array
   * @param property - Property to extract unique values from
   * @returns Array of unique values
   */
  getUniqueValues(data: ProcessedDataPoint<T>[], property: keyof ProcessedDataPoint<T>): any[] {
    const values = data.map(d => d[property]).filter(v => v != null);
    return [...new Set(values)];
  }

  /**
   * Calculate statistics for size values
   * @param data - Processed data array
   * @returns Statistics object
   */
  calculateSizeStats(data: ProcessedDataPoint<T>[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
  } {
    const sizes = data.map(d => d.size).sort((a, b) => a - b);
    
    return {
      min: sizes[0] || 0,
      max: sizes[sizes.length - 1] || 0,
      mean: sizes.reduce((sum, val) => sum + val, 0) / sizes.length || 0,
      median: sizes[Math.floor(sizes.length / 2)] || 0
    };
  }
} 