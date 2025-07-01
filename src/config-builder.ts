import * as d3 from 'd3';
import type { 
  BubbleChartConfig, 
  BubbleChartOptions,
  FormatFunctions 
} from './types/config.js';
import { createDefaultConfig as getDefaultConfig } from './types/config.js';

/**
 * Default configuration builder for BubbleChart
 * Implements the BubbleChartConfig interface with proper TypeScript typing
 */
export class ConfigBuilder implements BubbleChartConfig {
  // Core configuration (required in interface)
  container!: string;
  label!: string | string[] | ((d: any) => string);
  size!: string | string[] | ((d: any) => number);
  
  // Optional core settings
  time?: string | ((d: any) => number);
  type?: 'none' | 'wave' | 'liquid' | 'tree' | 'motion' | 'orbit' | 'list';
  defaultColor?: string;
  width?: number;
  height?: number;
  
  // Data processing
  sort?: boolean;
  percentage?: boolean | ((d: any) => number);
  
  // Color and styling
  color?: d3.ScaleOrdinal<string, string>;
  colour?: string | boolean;
  
  // Display options
  title?: string | boolean;
  leyend?: boolean;
  legend?: boolean;
  autoHideLegend?: boolean;
  
  // Layout and spacing
  offset?: number;
  padding?: number;
  cols?: number;
  p?: number;
  
  // Custom functions
  tooltip?: boolean | ((d: any) => Array<{ name: string; value: string | number }>);
  format?: FormatFunctions;
  
  // Hierarchical chart settings
  level?: number;
  levels?: string[];
  
  // Filtering and controls
  filters?: string[];
  toggle?: {
    title: string;
    size: boolean;
  };
  timeContainer?: 'footer' | 'header' | 'left' | 'right';
  
  // Chart-specific configurations
  wave?: {
    dy: number;
    count: number;
  };
  tree?: {
    speed: number;
    minRadius: number;
  };
  animation?: {
    speed: number;
    method: 'no-recursive' | 'recursive';
  };
  bubble?: {
    minRadius: number;
    animation: number;
    padding: number;
    allText: string;
  };
  listBubble?: {
    minRadius: number;
    maxRadius: number;
    padding: number;
    textWidth: number;
  };
  
  // Physics simulation
  cluster?: boolean;
  friction?: number;

  /**
   * Creates a new ConfigBuilder with default configuration
   * Merges default settings with any provided options
   */
  constructor(options?: Partial<BubbleChartOptions>) {
    // Get default configuration from our centralized function
    const defaults = getDefaultConfig();
    
    // Copy all default properties to this instance
    Object.assign(this, defaults);
    
    // Override with any provided options
    if (options) {
      Object.assign(this, options);
    }

    // Enhanced format functions with better error handling
    this.format = {
      text: (text: string, _key?: string): string => {
        // Handle undefined, null, or non-string values gracefully
        if (text == null || text === undefined) return '';
        const str = String(text);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      },
      number: (number: number, _data?: any): string => {
        // Handle undefined, null, or non-numeric values gracefully
        if (number == null || number === undefined || isNaN(number)) return '0';
        return d3.format('.2s')(number);
      }
    };
  }

  /**
   * Update configuration with new options
   * @param options - Partial configuration to merge
   * @returns this for method chaining
   */
  setOptions(options: Partial<BubbleChartConfig>): this {
    Object.assign(this, options);
    return this;
  }

  /**
   * Get the complete configuration object
   * @returns Complete BubbleChartConfig
   */
  getConfig(): BubbleChartConfig {
    return { ...this } as BubbleChartConfig;
  }

  /**
   * Validate the current configuration
   * @returns Array of validation error messages
   */
  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.container) {
      errors.push('container is required');
    }
    
    if (!this.label) {
      errors.push('label is required');
    }
    
    if (!this.size) {
      errors.push('size is required');
    }
    
    if (this.type && !['none', 'wave', 'liquid', 'tree', 'motion', 'orbit', 'list'].includes(this.type)) {
      errors.push(`Invalid chart type: ${this.type}`);
    }
    
    return errors;
  }
} 