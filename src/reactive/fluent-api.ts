/**
 * D3-Native Fluent API for Bubble Chart Creation
 * 
 * This module provides a D3-aligned fluent interface for creating bubble charts.
 * Key principles:
 * - Data-driven approach following D3 patterns
 * - Streaming-first design for motion/wave charts
 * - Minimal state management
 * - Configuration over convention
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, StreamingOptions, AnimationConfig } from '../types/config.js';
import { DataIntelligence } from './data-intelligence.js';
import { AnimationPresets, type AnimationPresetName } from './animation-presets.js';
import { DataFlowManager } from './data-flow.js';
import { BuilderFactory } from './builder-factory.js';
import { DataStore, type KeyFunction } from './store.js';

export interface FluentAnimationBlock {
  enter?: { duration: number; stagger?: number; easing?: string; delay?: number };
  update?: { duration: number; easing?: string; delay?: number };
  exit?: { duration: number; easing?: string; delay?: number };
}

export interface BubbleChart<T extends BubbleChartData = BubbleChartData> {
  readonly store: DataStore<T>;
  
  // Core lifecycle methods
  render(): this;
  destroy(): void;
  
  // Configuration methods
  setSizeMetric(field: string): this;
  setAnimations(preset: AnimationPresetName | AnimationConfig): this;
  
  // Event handling
  onBubble(event: string, handler: (data: T, event: MouseEvent, element: SVGElement) => void): this;
}

// Extended config interface for fluent API
interface FluentChartConfig extends Partial<BubbleChartOptions> {
  streaming?: StreamingOptions;
}

/**
 * D3-Native Chart Facade
 * Simplified facade focused on data flow and builder coordination
 */
class D3ChartFacade<T extends BubbleChartData = BubbleChartData> implements BubbleChart<T> {
  public readonly store: DataStore<T>;
  private builder: any; // Will be typed properly after builder refactoring
  private dataFlowManager: DataFlowManager<T>;
  private config: BubbleChartOptions;
  private isRendered = false;

  constructor(
    container: string,
    config: FluentChartConfig,
    keyFunction?: KeyFunction<T>
  ) {
    this.config = {
      container,
      label: 'name',
      size: 'value',
      ...config
    } as BubbleChartOptions;

    // Create builder using factory
    this.builder = BuilderFactory.create<T>(this.config);
    
    // Create data store with key function
    this.store = new DataStore<T>([], keyFunction);
    
    // Create data flow manager
    this.dataFlowManager = new DataFlowManager<T>(this.store, this.builder);
    
    // Set up reactive data flow
    this.store.on((stats) => {
      if (this.isRendered) {
        this.dataFlowManager.handleStreamingUpdate(stats, config.streaming);
      }
    });
  }

  render(): this {
    const currentData = [...this.store.data()] as T[];
    
    if (!this.dataFlowManager.initializeWithData(currentData)) {
      console.warn('D3ChartFacade: Failed to initialize with data');
      return this;
    }
    
    this.isRendered = true;
    return this;
  }

  setSizeMetric(field: string): this {
    this.builder.updateOptions({ size: field });
    
    // Force reprocessing with new size field
    const currentData = [...this.store.data()] as T[];
    this.builder.data(currentData).render();
    
    return this;
  }

  setAnimations(preset: AnimationPresetName | AnimationConfig): this {
    const animationConfig = typeof preset === 'string' ? 
      AnimationPresets.get(preset) : preset;
    
    this.builder.updateOptions({ animation: animationConfig });
    return this;
  }

  onBubble(event: string, handler: (data: T, event: MouseEvent, element: SVGElement) => void): this {
    if (this.builder && typeof this.builder.on === 'function') {
      this.builder.on(event, handler);
    }
    return this;
  }

  destroy(): void {
    this.store.clear();
    if (this.builder && typeof this.builder.destroy === 'function') {
      this.builder.destroy();
    }
  }
}

/**
 * D3-Native Fluent Chart API
 * 
 * Designed with D3 principles in mind:
 * - Data binding over state management
 * - Functional composition
 * - Streaming-first for motion/wave charts
 */
export class FluentChartAPI<T extends BubbleChartData = BubbleChartData> {
  private container: string;
  private dataSource?: T[] | any; // Support both flat arrays and hierarchical data
  private options: FluentChartConfig = {};
  private keyFunction?: KeyFunction<T>;

  constructor(container: string) {
    this.container = container;
  }

  /**
   * Set data with D3-style auto-analysis
   * Follows D3 pattern of data-driven configuration
   */
  withData(data: T[] | any): this {
    this.dataSource = data;
    
    // Auto-analyze data structure like D3 would
    if (Array.isArray(data) && data.length > 0) {
      const insights = DataIntelligence.inspectData(data);
      
      // Apply intelligent defaults based on data structure
      if (insights.suggested.size && !this.options.size) {
        this.options.size = insights.suggested.size;
      }
      if (insights.suggested.label && !this.options.label) {
        this.options.label = insights.suggested.label;
      }
      if (insights.suggested.color && !this.options.color) {
        // Create D3 color scale for categorical data
        const colorField = insights.suggested.color;
        const uniqueValues = [...new Set(data.map(item => (item as any)[colorField]))].filter(v => v != null);
        
        if (uniqueValues.length > 1) {
          this.options.color = d3.scaleOrdinal<string, string>()
            .domain(uniqueValues)
            .range([
              '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
              '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#1f77b4'
            ]);
        }
      }
      
      // Set smart animations based on data size
      if (!this.options.animation) {
        this.options.animation = AnimationPresets.forDataSize(data.length);
      }
    }
    
    return this;
  }

  /**
   * Configure data accessor fields with D3 patterns
   */
  withLabel(field: string | string[] | ((d: T) => string)): this {
    this.options.label = field as any;
    return this;
  }

  withSize(field: string | string[] | ((d: T) => number)): this {
    this.options.size = field as any;
    return this;
  }

  /**
   * Set color with D3 scale support
   * Supports D3 scales directly for seamless integration
   */
  withColor(colorSpec: string | ((d: T) => string) | d3.ScaleOrdinal<string, string>): this {
    if (typeof colorSpec === 'function' && 'domain' in colorSpec) {
      // D3 scale - use directly
      this.options.color = colorSpec;
    } else if (typeof colorSpec === 'function') {
      // Color function
      this.options.color = colorSpec as any;
    } else {
      // Field name - create D3 scale if we have data
      this.options.color = colorSpec as any;
      
      if (this.dataSource && Array.isArray(this.dataSource)) {
        const uniqueValues = [...new Set(this.dataSource.map(item => (item as any)[colorSpec]))].filter(v => v != null);
        if (uniqueValues.length > 1) {
          this.options.color = d3.scaleOrdinal<string, string>()
            .domain(uniqueValues)
            .range([
              '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
              '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#1f77b4'
            ]);
        }
      }
    }
    return this;
  }

  /**
   * Set chart type with streaming optimization
   */
  withType(type: 'bubble' | 'tree' | 'motion' | 'orbit' | 'list' | 'wave' | 'liquid'): this {
    this.options.type = type as any;
    
    // For motion/wave charts, enable streaming by default
    if ((type === 'motion' || type === 'wave') && !this.keyFunction) {
      this.keyFunction = (d: any) => d.id || d.name || JSON.stringify(d);
    }
    
    return this;
  }

  /**
   * Configure streaming for D3-native data updates
   */
  withStreaming(options: StreamingOptions): this {
    this.keyFunction = options.keyFunction as KeyFunction<T>;
    this.options.streaming = options;
    
    // Convert streaming options to animation config for consistency
    this.options.animation = {
      enter: {
        duration: options.enterAnimation.duration,
        stagger: options.enterAnimation.staggerDelay,
        easing: options.enterAnimation.easing || 'ease-out'
      },
      update: {
        duration: options.updateAnimation.duration,
        easing: options.updateAnimation.easing || 'ease-in-out'
      },
      exit: {
        duration: options.exitAnimation.duration,
        easing: options.exitAnimation.easing || 'ease-in'
      }
    };
    
    return this;
  }

  /**
   * Set chart dimensions
   */
  withDimensions(width: number, height: number): this {
    this.options.width = width;
    this.options.height = height;
    return this;
  }

  /**
   * Configure percentage calculation for wave/liquid charts
   */
  withPercentage(fn: (d: T) => number): this {
    this.options.percentage = fn as any;
    return this;
  }

  /**
   * Set animation presets or custom configuration
   */
  withAnimations(preset: AnimationPresetName | AnimationConfig): this {
    if (typeof preset === 'string') {
      this.options.animation = AnimationPresets.get(preset);
    } else {
      this.options.animation = preset;
    }
    return this;
  }

  /**
   * Apply custom configuration for advanced use cases
   */
  withCustomConfig(config: FluentChartConfig): this {
    this.options = { ...this.options, ...config };
    return this;
  }

  /**
   * Build and render the chart using D3-native patterns
   */
  render(): BubbleChart<T> {
    // Handle tree charts with hierarchical data specially
    if (this.options.type === 'tree' && this.dataSource && !Array.isArray(this.dataSource)) {
      // For tree charts, use TreeBuilder directly with hierarchical data
      const config: BubbleChartOptions = {
        container: this.container,
        type: 'tree',
        label: this.options.label ?? 'label',
        size: this.options.size ?? 'value',
        color: this.options.color,
        width: this.options.width,
        height: this.options.height,
        animation: this.options.animation,
        ...this.options
      } as BubbleChartOptions;

      const treeBuilder = BuilderFactory.create<T>(config);
      treeBuilder.data(this.dataSource as any).render();
      
      // Create simplified facade for tree charts
      const chart = new D3ChartFacade<T>(this.container, config, this.keyFunction);
      return chart;
    }

    // Standard flow for flat data arrays
    const chart = new D3ChartFacade<T>(this.container, this.options, this.keyFunction);
    
    // Initialize with data if provided
    if (this.dataSource) {
      const arrayData = Array.isArray(this.dataSource) ? this.dataSource : [this.dataSource];
      chart.store.addMany(arrayData);
    }
    
    // Render the chart
    chart.render();
    
    return chart;
  }
}

/**
 * D3-Native Factory Function
 * Entry point for creating charts with D3 patterns
 */
export function createChart<T extends BubbleChartData = BubbleChartData>(container: string): FluentChartAPI<T> {
  return new FluentChartAPI<T>(container);
}
