/**
 * Configuration types for Bubble Chart library
 * Based on ConfigBuilder class and D3.js integration patterns
 */

import * as d3 from 'd3';
import type { BubbleChartData } from './data.js';

/**
 * Chart type options available in the library
 */
export type ChartType = 
  | 'none' 
  | 'wave' 
  | 'liquid' 
  | 'tree' 
  | 'motion' 
  | 'orbit' 
  | 'list';

/**
 * Animation methods for chart transitions
 */
export type AnimationMethod = 'no-recursive' | 'recursive';

/**
 * Time container placement for timeline controls
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
 * Tooltip data structure returned by tooltip function
 */
export interface TooltipItem {
  /** Display value */
  value: string | number;
  /** Label/name for the value */
  name: string;
}

/**
 * Wave animation configuration
 */
export interface WaveConfig {
  /** Vertical displacement for wave effect */
  dy: number;
  /** Number of wave cycles */
  count: number;
}

/**
 * Tree layout configuration
 */
export interface TreeConfig {
  /** Animation speed in milliseconds */
  speed: number;
  /** Minimum radius for tree nodes */
  minRadius: number;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Animation duration in milliseconds */
  speed: number;
  /** Animation method type */
  method: AnimationMethod;
}

/**
 * Bubble-specific configuration
 */
export interface BubbleConfig {
  /** Minimum bubble radius */
  minRadius: number;
  /** Animation duration for bubble transitions */
  animation: number;
  /** Padding between bubbles */
  padding: number;
  /** Text for "show all" option */
  allText: string;
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
 * Event handler function types
 */
export interface EventHandlers<T = BubbleChartData> {
  /** Click event handler */
  click?: (data: T, event?: MouseEvent) => void;
  /** Mouse enter event handler */
  mouseenter?: (data: T, event?: MouseEvent) => void;
  /** Mouse over event handler */
  mouseover?: (data: T, event?: MouseEvent) => void;
  /** Mouse out event handler */
  mouseout?: (data: T, event?: MouseEvent) => void;
  /** Time change event handler (for temporal charts) */
  timechange?: (year: number, month?: number) => void;
}

/**
 * Main bubble chart configuration interface
 * Comprehensive configuration options for all chart types
 */
export interface BubbleChartConfig {
  // Core configuration
  /** DOM selector or element for chart container */
  container: string;
  /** Property name(s) or accessor function for labels */
  label: string | string[] | ((d: BubbleChartData) => string);
  /** Property name(s) or accessor function for sizing */
  size: string | string[] | ((d: BubbleChartData) => number);
  
  // Optional core settings
  /** Property name or accessor for time dimension */
  time?: string | ((d: BubbleChartData) => number);
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
  percentage?: boolean | ((d: BubbleChartData) => number);
  
  // Color and styling
  /** D3.js color scale */
  color?: d3.ScaleOrdinal<string, string>;
  /** Property name for color grouping */
  colour?: string | boolean;
  
  // Display options
  /** Property name for tooltip titles */
  title?: string | boolean;
  /** Whether to show legend */
  leyend?: boolean;
  /** Chart legend configuration */
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
  /** Layout clustering parameter */
  p?: number;
  
  // Custom functions
  /** Custom tooltip function */
  tooltip?: boolean | ((d: BubbleChartData) => TooltipItem[]);
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
}

/**
 * Configuration options that can be passed to BubbleChart constructor
 * Subset of BubbleChartConfig with only user-facing options
 * @template T - The data type for type-safe function parameters
 */
export interface BubbleChartOptions<T extends BubbleChartData = BubbleChartData> {
  /** DOM selector for chart container */
  container: string;
  /** Label property or accessor */
  label: string | string[];
  /** Size property or accessor */
  size: string | string[];
  /** Time property for temporal charts */
  time?: string;
  /** Chart type */
  type?: ChartType;
  /** Default bubble color */
  defaultColor?: string;
  /** Chart dimensions */
  width?: number;
  height?: number;
  /** Percentage calculation function */
  percentage?: (d: T) => number;
  /** Format functions */
  format?: FormatFunctions;
  /** Tooltip function */
  tooltip?: (d: T) => TooltipItem[];
}

/**
 * D3.js scale type aliases for better type safety
 */
export type ColorScale = d3.ScaleOrdinal<string, string>;
export type SizeScale = d3.ScaleLinear<number, number> | d3.ScalePower<number, number>;
export type TimeScale = d3.ScaleTime<number, number>;

/**
 * D3.js selection types for different SVG elements
 */
export type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type CircleSelection<T = BubbleChartData> = d3.Selection<SVGCircleElement, T, SVGGElement, unknown>;
export type TextSelection<T = BubbleChartData> = d3.Selection<SVGTextElement, T, SVGGElement, unknown>;

/**
 * Configuration validation functions
 */

/**
 * Validates that required configuration options are present
 */
export function validateConfig(config: Partial<BubbleChartConfig> | null | undefined): string[] {
  const errors: string[] = [];
  
  if (!config) {
    errors.push('configuration object is required');
    return errors;
  }
  
  if (!config.container) {
    errors.push('container is required');
  }
  
  if (!config.label) {
    errors.push('label is required');
  }
  
  if (!config.size) {
    errors.push('size is required');
  }
  
  if (config.type && !['none', 'wave', 'liquid', 'tree', 'motion', 'orbit', 'list'].includes(config.type)) {
    errors.push(`Invalid chart type: ${config.type}`);
  }
  
  return errors;
}

/**
 * Creates default configuration with type safety
 */
export function createDefaultConfig(): BubbleChartConfig {
  const colorPalette = [
    '#FF6384', '#4BC0C0', '#FFCE56', '#c2b9d6', '#36A2EB',
    '#8161c7', '#196998', '#8bc4eb', '#4b36eb', '#ffe197',
    '#ffa4b7', '#98e6e6', '#c2b9d6', '#36eb7c'
  ];

  return {
    // Required fields (will be overridden)
    container: '',
    label: '',
    size: '',
    
    // Default configuration
    defaultColor: '#ddd',
    type: 'none',
    width: 500,
    height: 500,
    sort: false,
    percentage: false,
    color: d3.scaleOrdinal<string>().range(colorPalette),
    
    // Display options
    colour: false,
    title: false,
    leyend: false,
    legend: false,
    autoHideLegend: true,
    
    // Layout
    offset: 5,
    padding: 30,
    cols: 5,
    p: 0.3,
    
    // Tooltip
    tooltip: false,
    
    // Hierarchy
    level: 0,
    levels: [],
    
    // Filters
    filters: [],
    
    // Controls
    toggle: {
      title: '',
      size: false
    },
    timeContainer: 'footer',
    
    // Chart-specific configs
    wave: {
      dy: 11,
      count: 4
    },
    
    tree: {
      speed: 150,
      minRadius: 10,
    },
    
    animation: {
      speed: 3000,
      method: 'no-recursive'
    },
    
    bubble: {
      minRadius: 10,
      animation: 2000,
      padding: 10,
      allText: 'All'
    },
    
    listBubble: {
      minRadius: 2,
      maxRadius: 25,
      padding: 5,
      textWidth: 200
    },
    
    // Physics
    cluster: true,
    friction: 0.85,
    
    // Format functions
    format: {
      text: (text: string) => {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      },
      number: (number: number) => {
        return d3.format('.2s')(number);
      }
    }
  };
} 