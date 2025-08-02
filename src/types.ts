/**
 * Unified Type Definitions for Bubble Chart Library
 * Single source of truth for all types, interfaces, and type utilities
 * 
 * Consolidates types from:
 * - src/config/config.ts
 * - src/config/simple-config.ts  
 * - src/data/data.ts
 * - src/events/events.ts
 * - src/d3/d3-helpers.ts
 * - src/types/index.ts
 */

import * as d3 from 'd3';

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * Base interface for all bubble chart data points
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
 * Flat data structure for basic bubble charts
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
 * Hierarchical data structure for tree visualizations
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
 * Time series value structure
 */
export interface TimeSeriesValue {
  /** Year of the data point */
  year: number;
  /** Month of the data point (1-12) */
  month?: number;
  /** Primary metric value */
  value?: number;
  /** Additional metrics */
  [metric: string]: unknown;
}

/**
 * Time series bubble data structure
 */
export interface TimeSeriesBubbleData {
  /** Series name/identifier */
  name: string;
  /** Optional display label */
  label?: string;
  /** Array of temporal data points */
  values: TimeSeriesValue[];
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Economic time series data structure
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
 */
export type BubbleChartData = 
  | FlatBubbleData 
  | HierarchicalBubbleData 
  | TimeSeriesBubbleData 
  | EconomicTimeSeriesData;

/**
 * Processed data point for internal use
 */
export interface ProcessedDataPoint<T = BubbleChartData> {
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

// =============================================================================
// CHART CONFIGURATION
// =============================================================================

/**
 * Chart type options
 */
export type ChartType = 
  | 'bubble'
  | 'wave' 
  | 'liquid' 
  | 'tree' 
  | 'motion' 
  | 'orbit' 
  | 'list';

/**
 * Time container placement
 */
export type TimeContainer = 'footer' | 'header' | 'left' | 'right';

/**
 * Format functions for data display
 */
export interface FormatFunctions {
  /** Text formatting function */
  text?: (text: string, key?: string) => string;
  /** Number formatting function */
  number?: (number: number, data?: BubbleChartData) => string;
}

/**
 * Tooltip data structure
 */
export interface TooltipItem {
  /** Display value */
  value: string | number;
  /** Label/name for the value */
  name: string;
}

/**
 * Tooltip configuration modes
 */
export type TooltipMode = 'auto' | 'custom' | 'minimal' | 'detailed' | 'none';

/**
 * Tooltip field configuration
 */
export interface TooltipField {
  key: string;
  label?: string;
  formatter?: (value: any) => string;
  priority?: number;
}

/**
 * Advanced tooltip configuration
 */
export interface TooltipConfig {
  mode: TooltipMode;
  fields?: TooltipField[];
  maxFields?: number;
  customTemplate?: (data: any) => string;
  showDataTypes?: boolean;
  includeStatistics?: boolean;
}

/**
 * Animation configuration for chart transitions
 */
export interface AnimationConfig {
  enter?: {
    duration: number;
    stagger?: number;
    easing?: string;
    delay?: number;
  };
  update?: {
    duration: number;
    easing?: string;
    delay?: number;
  };
  exit?: {
    duration: number;
    easing?: string;
    delay?: number;
  };
}

/**
 * Bubble-specific configuration
 */
export interface BubbleConfig {
  /** Minimum bubble radius */
  minRadius: number;
  /** Maximum bubble radius */
  maxRadius: number;
  /** Animation duration for bubble transitions */
  animation: number;
  /** Padding between bubbles */
  padding: number;
  /** Text for "show all" option */
  allText: string;
}

/**
 * List bubble configuration
 */
export interface ListBubbleConfig {
  /** Minimum bubble radius in list view */
  minRadius: number;
  /** Maximum bubble radius in list view */
  maxRadius: number;
  /** Padding between list items */
  padding: number;
  /** Width for text labels */
  textWidth: number;
}

/**
 * Wave configuration
 */
export interface WaveConfig {
  /** Vertical displacement for wave effect */
  dy: number;
  /** Number of wave cycles */
  count: number;
}

/**
 * Tree configuration
 */
export interface TreeConfig {
  /** Animation speed in milliseconds */
  speed: number;
  /** Minimum radius for tree nodes */
  minRadius: number;
}

/**
 * Toggle control configuration
 */
export interface ToggleConfig {
  /** Title for the toggle control */
  title: string;
  /** Whether size toggle is enabled */
  size: boolean;
}

/**
 * Responsive behavior configuration
 */
export interface ResponsiveConfig {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  maintainAspectRatio?: boolean;
  debounceMs?: number;
  onResize?: (dimensions: { width: number; height: number }) => void;
}

/**
 * Main chart configuration interface
 */
export interface BubbleChartOptions<T extends BubbleChartData = BubbleChartData> {
  // Core configuration (required)
  /** DOM selector or element for chart container */
  container: string;
  /** Property name(s) or accessor function for labels */
  label: string | string[] | ((d: T) => string);
  /** Property name(s) or accessor function for sizing */
  size: string | string[] | ((d: T) => number);
  
  // Optional core settings
  /** Property name or accessor for time dimension */
  time?: string | ((d: T) => number);
  /** Chart type */
  type?: ChartType;
  /** Default color for bubbles */
  defaultColor?: string;
  /** Chart width in pixels */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  
  // Data processing
  /** Whether to sort data */
  sort?: boolean;
  /** Percentage calculation function */
  percentage?: ((d: T) => number);
  /** Key function for D3 data joins */
  keyFunction?: ((d: T) => string | number);
  
  // Color and styling
  /** Color configuration */
  color?: d3.ScaleOrdinal<string, string> | ((data: T, index?: number) => string) | string;
  /** Color palette type */
  palette?: 'vibrant' | 'sophisticated' | 'pastel' | 'neon' | 'wave' | 'liquid';
  /** Theme name */
  theme?: 'corporate' | 'ocean' | 'sunset' | 'forest' | 'slate' | 'wave';
  /** Property name for color grouping */
  colour?: string | boolean;
  
  // Display options
  /** Property name for tooltip titles */
  title?: string | boolean;
  /** Whether to show legend */
  legend?: boolean;
  /** Whether to auto-hide legend */
  autoHideLegend?: boolean;
  
  // Layout and spacing
  /** Offset for chart elements */
  offset?: number;
  /** General padding */
  padding?: number;
  /** Number of columns for layout */
  cols?: number;
  
  // Custom functions
  /** Tooltip configuration */
  tooltip?: boolean | ((d: T) => TooltipItem[]) | string[] | TooltipConfig | TooltipMode;
  /** Format functions */
  format?: FormatFunctions;
  
  // Hierarchical chart settings
  /** Current level in hierarchy */
  level?: number;
  /** Level information for breadcrumbs */
  levels?: string[];
  
  // Filtering and controls
  /** Available filter options */
  filters?: string[];
  /** Toggle control settings */
  toggle?: ToggleConfig;
  /** Time container placement */
  timeContainer?: TimeContainer;
  
  // Chart-specific configurations
  /** Wave animation settings */
  wave?: WaveConfig;
  /** Tree layout settings */
  tree?: TreeConfig;
  /** Animation configuration */
  animation?: AnimationConfig;
  /** Bubble-specific settings */
  bubble?: BubbleConfig;
  /** List bubble settings */
  listBubble?: ListBubbleConfig;
  
  // Physics simulation (for orbit, motion charts)
  /** Whether to enable clustering */
  cluster?: boolean;
  /** Friction coefficient for simulations */
  friction?: number;
  
  // Interactive features
  /** Enable interactive filtering */
  interactiveFiltering?: boolean;
  
  // Responsive configuration
  /** Responsive behavior settings */
  responsive?: ResponsiveConfig;
}

// =============================================================================
// EVENT SYSTEM
// =============================================================================

/**
 * Supported event types
 */
export type BubbleEventType = 
  | 'click'
  | 'mouseover' 
  | 'mouseout'
  | 'mouseenter'
  | 'mouseleave'
  | 'timechange'
  | 'datachange'
  | 'render'
  | 'destroy';

/**
 * Event handler for data-related events
 */
export type DataEventHandler<T = BubbleChartData> = (
  data: T,
  event: MouseEvent,
  element: SVGElement
) => void;

/**
 * Event handler for time-based events
 */
export type TimeEventHandler = (
  year: number,
  month?: number,
  event?: Event
) => void;

/**
 * Event handler for lifecycle events
 */
export type LifecycleEventHandler = (chart: unknown) => void;

/**
 * Generic event handler type
 */
export type EventHandler<T = BubbleChartData> = 
  | DataEventHandler<T>
  | TimeEventHandler
  | LifecycleEventHandler;

/**
 * Event handlers interface
 */
export interface BubbleEventHandlers<T = BubbleChartData> {
  /** Bubble click event */
  click?: DataEventHandler<T>;
  /** Mouse over bubble event */
  mouseover?: DataEventHandler<T>;
  /** Mouse out of bubble event */
  mouseout?: DataEventHandler<T>;
  /** Mouse enter bubble event */
  mouseenter?: DataEventHandler<T>;
  /** Mouse leave bubble event */
  mouseleave?: DataEventHandler<T>;
  /** Time/timeline change event */
  timechange?: TimeEventHandler;
  /** Data update event */
  datachange?: LifecycleEventHandler;
  /** Chart render completion event */
  render?: LifecycleEventHandler;
  /** Chart destruction event */
  destroy?: LifecycleEventHandler;
}

/**
 * Event payload structure
 */
export interface BubbleEventPayload<T = BubbleChartData> {
  /** Event type */
  type: BubbleEventType;
  /** Data associated with the event */
  data?: T;
  /** Original browser event */
  originalEvent?: Event;
  /** Target SVG element */
  target?: SVGElement;
  /** Chart instance that triggered the event */
  chart?: unknown;
  /** Additional event-specific data */
  [key: string]: unknown;
}

// =============================================================================
// D3 TYPE ALIASES
// =============================================================================

/**
 * D3 Selection Types
 */
export type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type CircleSelection<T = BubbleChartData> = d3.Selection<SVGCircleElement, T, SVGGElement, unknown>;
export type TextSelection<T = BubbleChartData> = d3.Selection<SVGTextElement, T, SVGGElement, unknown>;
export type PathSelection<T = BubbleChartData> = d3.Selection<SVGPathElement, T, SVGGElement, unknown>;
export type RectSelection<T = BubbleChartData> = d3.Selection<SVGRectElement, T, SVGGElement, unknown>;

/**
 * D3 Scale Types
 */
export type ColorScale = d3.ScaleOrdinal<string, string>;
export type SizeScale = d3.ScaleLinear<number, number> | d3.ScalePower<number, number>;
export type TimeScale = d3.ScaleTime<number, number>;
export type LinearScale = d3.ScaleLinear<number, number>;
export type OrdinalScale<T extends string = string> = d3.ScaleOrdinal<T, string>;
export type SqrtScale = d3.ScalePower<number, number>;
export type BandScale = d3.ScaleBand<string>;

/**
 * D3 Layout Types
 */
export type PackLayout<T = BubbleChartData> = d3.PackLayout<T>;
export type HierarchyNode<T = HierarchicalBubbleData> = d3.HierarchyNode<T>;
export type PackHierarchyNode<T = HierarchicalBubbleData> = d3.HierarchyCircularNode<T>;

/**
 * D3 Force Types
 */
export type ForceSimulation = d3.Simulation<d3.SimulationNodeDatum, undefined>;
export type ForceCenter = d3.ForceCenter<d3.SimulationNodeDatum>;
export type ForceCollide = d3.ForceCollide<d3.SimulationNodeDatum>;
export type ForceManyBody = d3.ForceManyBody<d3.SimulationNodeDatum>;

/**
 * D3 Transition Types
 */
export type Transition<TElement extends d3.BaseType = SVGElement, TData = BubbleChartData> = 
  d3.Transition<TElement, TData, SVGGElement, unknown>;

/**
 * D3 Accessor Types
 */
export type NumericAccessor<T = BubbleChartData> = (d: T, i?: number) => number;
export type StringAccessor<T = BubbleChartData> = (d: T, i?: number) => string;
export type ColorAccessor<T = BubbleChartData> = (d: T, i?: number) => string;

// =============================================================================
// UTILITY INTERFACES
// =============================================================================

/**
 * Chart handle interface for unified API
 */
export interface ChartHandle<T extends BubbleChartData = BubbleChartData> {
  /** Get readonly merged options */
  options(): Readonly<BubbleChartOptions<T>>;
  /** Merge-update options */
  updateOptions(options: Partial<BubbleChartOptions<T>>): this;
  /** Update chart with new data */
  update(data?: T[]): this;
  /** Destroy the chart and clean up resources */
  destroy(): void;
}

/**
 * SVG Manager interfaces
 */
export interface SVGDimensions {
  width: number;
  height: number;
}

export interface SVGElements {
  container: any;
  svg: any;
  mainGroup: any;
  dimensions: SVGDimensions;
}

/**
 * Streaming update configuration
 */
export interface StreamingOptions {
  enterAnimation: {
    duration: number;
    staggerDelay: number;
    easing?: string;
  };
  exitAnimation: {
    duration: number;
    easing?: string;
  };
  updateAnimation: {
    duration: number;
    easing?: string;
  };
  keyFunction?: (d: any) => string | number;
}

/**
 * Streaming update result
 */
export interface StreamingUpdateResult {
  entered: number;
  updated: number;
  exited: number;
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Type guard for flat bubble data
 */
export function isFlatBubbleData(obj: unknown): obj is FlatBubbleData {
  return typeof obj === 'object' && obj !== null && 
         'label' in obj && 'size' in obj && 
         typeof (obj as any).label === 'string' && 
         typeof (obj as any).size === 'number';
}

/**
 * Type guard for hierarchical bubble data
 */
export function isHierarchicalBubbleData(obj: unknown): obj is HierarchicalBubbleData {
  return typeof obj === 'object' && obj !== null && 
         'name' in obj && 'label' in obj && 
         typeof (obj as any).name === 'string' && 
         typeof (obj as any).label === 'string';
}

/**
 * Type guard for time series bubble data
 */
export function isTimeSeriesBubbleData(obj: unknown): obj is TimeSeriesBubbleData {
  return typeof obj === 'object' && obj !== null && 
         'name' in obj && 'values' in obj && 
         Array.isArray((obj as any).values);
}

/**
 * Extract data type from array
 */
export type ExtractDataType<T> = T extends (infer U)[] ? U : T;

/**
 * Get numeric value using accessor
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
 * Get string value using accessor
 */
export function getStringValue<T>(
  data: T, 
  accessor: keyof T | ((d: T) => string)
): string {
  if (typeof accessor === 'function') {
    return accessor(data);
  }
  const value = data[accessor];
  return typeof value === 'string' ? value : String(value || '');
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate chart configuration
 */
export function validateConfig(config: Partial<BubbleChartOptions> | null | undefined): string[] {
  const errors: string[] = [];
  
  if (!config) {
    errors.push('Configuration is required');
    return errors;
  }
  
  // Required fields
  if (!config.container) {
    errors.push('container is required');
  }
  
  if (!config.label) {
    errors.push('label is required');
  }
  
  if (!config.size) {
    errors.push('size is required');
  }
  
  // Type validation
  if (config.type && !['bubble', 'wave', 'liquid', 'tree', 'motion', 'orbit', 'list'].includes(config.type)) {
    errors.push(`Invalid chart type: ${config.type}`);
  }
  
  // Dimension validation
  if (config.width !== undefined && (typeof config.width !== 'number' || config.width <= 0)) {
    errors.push('width must be a positive number');
  }
  
  if (config.height !== undefined && (typeof config.height !== 'number' || config.height <= 0)) {
    errors.push('height must be a positive number');
  }
  
  return errors;
}

/**
 * Create default configuration
 */
export function createDefaultConfig(): BubbleChartOptions {
  return {
    container: '#chart',
    label: 'label',
    size: 'size',
    type: 'bubble',
    width: 500,
    height: 400,
    defaultColor: '#1f77b4',
    theme: 'corporate',
    sort: true,
    animation: {
      enter: { duration: 800, stagger: 50 },
      update: { duration: 600 },
      exit: { duration: 400 }
    },
    bubble: {
      minRadius: 8,
      maxRadius: 50,
      animation: 800,
      padding: 2,
      allText: 'All'
    },
    responsive: {
      debounceMs: 200,
      maintainAspectRatio: false
    }
  };
} 