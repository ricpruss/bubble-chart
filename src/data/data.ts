/**
 * Core data types for Bubble Chart library
 * Based on actual data structures from examples and test datasets
 */

/**
 * Base interface for all bubble chart data points
 * Contains minimum required properties for bubble visualization
 */
export interface BubbleDataPoint {
  /** Display label for the bubble */
  label: string;
  /** Numeric value used for bubble sizing */
  size: number;
  /** Optional year for temporal filtering */
  year?: number;
  /** Allow additional custom properties */
  [key: string]: unknown;
}

/**
 * Flat data structure (e.g., companies dataset)
 * Used for basic bubble charts with categorical grouping
 */
export interface FlatBubbleData extends BubbleDataPoint {
  /** Secondary metric for multi-dimensional analysis */
  count?: number;
  /** Category/type for grouping and coloring */
  type?: string;
  /** Alternative category field */
  category?: string;
  /** Alternative size field name */
  amount?: number;
}

/**
 * Hierarchical/Tree data structure (e.g., tech-hierarchy dataset)
 * Used for nested bubble charts and tree visualizations
 */
export interface HierarchicalBubbleData {
  /** Unique identifier */
  name: string;
  /** Display label (often same as name) */
  label: string;
  /** Year for temporal context */
  year?: number;
  /** Size value for leaf nodes */
  amount?: number;
  /** Child nodes for hierarchical structure */
  children?: HierarchicalBubbleData[];
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Time series value point
 * Individual data point within a temporal series
 */
export interface TimeSeriesValue {
  /** Year of the data point */
  year: number;
  /** Month of the data point (1-12) */
  month?: number;
  /** Primary metric value */
  value?: number;
  /** Additional metrics (e.g., complaints, investigations) */
  [metric: string]: unknown;
}

/**
 * Time series data structure (e.g., sector-complaints dataset)
 * Used for motion bubbles and temporal visualizations
 */
export interface TimeSeriesBubbleData {
  /** Series name/identifier */
  name: string;
  /** Optional display label */
  label?: string;
  /** Array of temporal data points */
  values: TimeSeriesValue[];
  /** Allow additional series-level properties */
  [key: string]: unknown;
}

/**
 * Economic time series data (e.g., GDP data)
 * Simplified temporal structure for economic indicators
 */
export interface EconomicTimeSeriesData {
  /** Country or entity name */
  name: string;
  /** Year of the data */
  year: number;
  /** Economic value (e.g., GDP) */
  value: number;
  /** Month if available */
  month?: number;
  /** Additional economic indicators */
  [indicator: string]: unknown;
}

/**
 * Union type for all supported data structures
 * Allows functions to accept any valid bubble chart data
 */
export type BubbleChartData = 
  | FlatBubbleData 
  | HierarchicalBubbleData 
  | TimeSeriesBubbleData 
  | EconomicTimeSeriesData;

/**
 * Array types for different data structures
 */
export type FlatDataArray = FlatBubbleData[];
export type TimeSeriesDataArray = TimeSeriesBubbleData[];
export type EconomicDataArray = EconomicTimeSeriesData[];

/**
 * Generic data accessor type
 * Allows flexible property access via string key or function
 */
export interface DataAccessor<T = BubbleChartData> {
  /** Label accessor - can be property name or function */
  label: keyof T | ((d: T) => string);
  /** Size accessor - can be property name or function */
  size: keyof T | ((d: T) => number);
  /** Optional color/category accessor */
  color?: keyof T | ((d: T) => string);
  /** Optional time accessor for temporal data */
  time?: keyof T | ((d: T) => number);
}

/**
 * Data validation and type guard functions
 */

/**
 * Type guard for flat bubble data
 */
export function isFlatBubbleData(obj: unknown): obj is FlatBubbleData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'label' in obj &&
    'size' in obj &&
    typeof (obj as Record<string, unknown>).label === 'string' &&
    typeof (obj as Record<string, unknown>).size === 'number'
  );
}

/**
 * Type guard for hierarchical bubble data
 */
export function isHierarchicalBubbleData(obj: unknown): obj is HierarchicalBubbleData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'label' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string' &&
    typeof (obj as Record<string, unknown>).label === 'string'
  );
}

/**
 * Type guard for time series bubble data
 */
export function isTimeSeriesBubbleData(obj: unknown): obj is TimeSeriesBubbleData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'values' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string' &&
    Array.isArray((obj as Record<string, unknown>).values)
  );
}

/**
 * Type guard for checking if data array contains flat data
 */
export function isFlatDataArray(data: unknown[]): data is FlatBubbleData[] {
  return data.length > 0 && data.every(isFlatBubbleData);
}

/**
 * Type guard for checking if data is hierarchical
 */
export function isHierarchicalData(data: unknown): data is HierarchicalBubbleData {
  return isHierarchicalBubbleData(data);
}

/**
 * Type guard for checking if data array contains time series data
 */
export function isTimeSeriesDataArray(data: unknown[]): data is TimeSeriesBubbleData[] {
  return data.length > 0 && data.every(isTimeSeriesBubbleData);
}

/**
 * Utility type for extracting data from different structures
 */
export type ExtractDataType<T> = T extends (infer U)[] ? U : T;

/**
 * Utility function to get numeric value from data using accessor
 */
export function getNumericValue<T>(
  data: T, 
  accessor: keyof T | ((d: T) => number)
): number {
  if (typeof accessor === 'function') {
    return accessor(data);
  }
  const value = data[accessor];
  return typeof value === 'number' ? value : 0;
}

/**
 * Utility function to get string value from data using accessor
 */
export function getStringValue<T>(
  data: T, 
  accessor: keyof T | ((d: T) => string)
): string {
  if (typeof accessor === 'function') {
    return accessor(data);
  }
  const value = data[accessor];
  return typeof value === 'string' ? value : String(value ?? '');
} 