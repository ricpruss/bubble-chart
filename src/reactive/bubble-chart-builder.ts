/**
 * BubbleChartBuilder - Fluent API for creating bubble charts with intelligent defaults
 * 
 * Extracted from chart.ts for better separation of concerns and maintainability.
 * This module provides the legacy fluent builder pattern for backward compatibility.
 * 
 * For new development, consider using the D3-native FluentChartAPI from fluent-api.ts
 */

import * as d3 from 'd3';
import { TreeBuilder } from '../tree-builder.js';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, StreamingOptions } from '../types/config.js';
import { DataIntelligence } from './data-intelligence.js';
import { AnimationPresets, type AnimationPresetName } from './animation-presets.js';
import type { AnimationConfig } from '../types/config.js';
import { type TooltipConfig, type TooltipMode } from '../types/config.js';
import { type BubbleChartOptionsExtended } from './reactive-config.js';
import { type KeyFunction } from './store.js';

// Import types and classes from chart.ts
import type { BubbleChart } from './chart.js';
import { BubbleChartFacade } from './chart.js';

/**
 * Fluent builder for creating bubble charts with intelligent defaults
 */
export class BubbleChartBuilder<T extends BubbleChartData = BubbleChartData> {
  private container: string;
  private dataSource?: T[];
  private options: BubbleChartOptionsExtended<T> = {};
  private keyFunction?: KeyFunction<T>;

  constructor(container: string) {
    this.container = container;
  }

  /**
   * Set data with automatic field detection
   */
  withData(data: T[]): this {
    this.dataSource = data;
    
    // Automatically analyze data and apply intelligent defaults
    if (data.length > 0) {
      const insights = DataIntelligence.inspectData(data);
      
      // Apply intelligent field suggestions
      if (insights.suggested.size) {
        this.options.size = insights.suggested.size;
      }
      if (insights.suggested.label) {
        this.options.label = insights.suggested.label;
      }
      if (insights.suggested.color) {
        // Set both the field name and create a D3 color scale
        this.options.colour = insights.suggested.color;
        
        // Get unique values for the categorical field
        const colorField = insights.suggested.color;
        const uniqueValues = [...new Set(data.map(item => (item as any)[colorField]))].filter(v => v != null);
        
        // Create a D3 ordinal color scale with a nice color palette
        this.options.color = d3.scaleOrdinal<string, string>()
          .domain(uniqueValues)
          .range([
            '#FF6384', '#4BC0C0', '#FFCE56', '#c2b9d6', '#36A2EB',
            '#8161c7', '#196998', '#8bc4eb', '#4b36eb', '#ffe197',
            '#ffa4b7', '#98e6e6', '#c2b9d6', '#36eb7c'
          ]);
      }
      
      // Set smart animation based on data size
      const animations = AnimationPresets.forDataSize(data.length);
      this.options.animations = animations;
    }
    
    return this;
  }

  /**
   * Override auto-detected size field
   */
  withSize(field: string | ((d: T) => number)): this {
    this.options.size = field as any;
    return this;
  }

  /**
   * Override auto-detected label field
   */
  withLabel(field: string | ((d: T) => string)): this {
    this.options.label = field as any;
    return this;
  }

  /**
   * Override auto-detected color field or function
   */
  withColor(field: string | ((d: T) => string) | d3.ScaleOrdinal<string, string>): this {
    if (typeof field === 'function' && 'domain' in field) {
      // It's a D3 scale
      this.options.color = field;
    } else if (typeof field === 'function') {
      // It's a color function
      this.options.color = field as any;
    } else {
      // It's a field name - set up auto-coloring
      this.options.colour = field as string;
      
      // If we have data, create a color scale for this field
      if (this.dataSource) {
        let items: any[] = [];
        if (Array.isArray(this.dataSource)) {
          items = this.dataSource as any[];
        } else if (typeof this.dataSource === 'object') {
          // Hierarchical root object – collect leaf nodes
          const collectLeaves = (node: any) => {
            if (node.children && Array.isArray(node.children)) {
              node.children.forEach(collectLeaves);
            } else {
              items.push(node);
            }
          };
          collectLeaves(this.dataSource);
        }

        if (items.length > 0) {
          const uniqueValues = [...new Set(items.map(item => (item as any)[field]))].filter(v => v != null);
          this.options.color = d3.scaleOrdinal<string, string>()
            .domain(uniqueValues)
            .range([
              '#FF6384', '#4BC0C0', '#FFCE56', '#c2b9d6', '#36A2EB',
              '#8161c7', '#196998', '#8bc4eb', '#4b36eb', '#ffe197',
              '#ffa4b7', '#98e6e6', '#c2b9d6', '#36eb7c'
            ]);
        }
      }
    }
    return this;
  }

  /**
   * Set time field for temporal charts
   */
  withTime(field: string | ((d: T) => number)): this {
    this.options.time = field as any;
    return this;
  }

  /**
   * Set percentage calculation for wave and liquid charts
   */
  withPercentage(fn: (d: T) => number): this {
    this.options.percentage = fn as any;
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
   * Set chart type
   */
  withType(type: 'bubble' | 'tree' | 'motion' | 'orbit' | 'list' | 'wave' | 'liquid'): this {
    this.options.type = type as any;
    return this;
  }

  /**
   * Configure tooltips
   */
  withTooltips(config: 'auto' | 'none' | string[] | TooltipConfig): this {
    if (config === 'auto') {
      // Auto-generate tooltips based on data intelligence
      if (this.dataSource && this.dataSource.length > 0) {
        this.options.tooltip = true; // Enable tooltip system
        // TODO: Store specific fields for tooltip implementation
      }
    } else if (config === 'none') {
      this.options.tooltip = false;
    } else if (Array.isArray(config)) {
      this.options.tooltip = true;
      // TODO: Store specific fields for tooltip implementation
    } else {
      this.options.tooltip = true;
      // TODO: Store TooltipConfig for advanced tooltip implementation
    }
    return this;
  }

  /**
   * Enable streaming with intelligent defaults
   */
  withStreaming(options?: StreamingOptions): this {
    // Set streaming options or use intelligent defaults
    const keyFunction = options?.keyFunction || ((d: any) => d.id || d.name || JSON.stringify(d));
    this.keyFunction = keyFunction;
    this.options.key = keyFunction;
    
    // Store streaming options for later use
    if (options) {
      // Convert to animation config
      this.options.animations = {
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
    }
    
    return this;
  }

  /**
   * Group data by a categorical field (auto-assigns colors)
   */
  withGrouping(field: string): this {
    // Set up grouping and auto-color assignment
    this.options.colour = field;
    
    // If we have data, create a color scale for this field
    if (this.dataSource && this.dataSource.length > 0) {
      const uniqueValues = [...new Set(this.dataSource.map(item => (item as any)[field]))].filter(v => v != null);
      this.options.color = d3.scaleOrdinal<string, string>()
        .domain(uniqueValues)
        .range([
          '#FF6384', '#4BC0C0', '#FFCE56', '#c2b9d6', '#36A2EB',
          '#8161c7', '#196998', '#8bc4eb', '#4b36eb', '#ffe197',
          '#ffa4b7', '#98e6e6', '#c2b9d6', '#36eb7c'
        ]);
    }
    
    return this;
  }

  /**
   * Set animation preset or custom configuration
   */
  withAnimations(preset: AnimationPresetName | AnimationConfig): this {
    if (typeof preset === 'string') {
      this.options.animations = AnimationPresets.get(preset);
    } else {
      this.options.animations = preset;
    }
    return this;
  }

  /**
   * Set animation preset or custom configuration (alias for withAnimations)
   */
  setAnimations(preset: AnimationPresetName | AnimationConfig): this {
    return this.withAnimations(preset);
  }

  /**
   * Configure intelligent tooltips
   */
  setTooltips(_mode: TooltipMode | TooltipConfig): this {
    // Store tooltip configuration for later use
    return this;
  }

  /**
   * Use an observable as data source
   */
  fromObservable(_source: any): this {
    // TODO: Implement observable data source binding
    // This would subscribe to the observable and update the chart when data changes
    console.warn('fromObservable not yet implemented');
    return this;
  }

  /**
   * Use a WebSocket as data source
   */
  fromWebSocket(_config: { url: string; reconnect?: boolean; transform?: (data: any) => T[] }): this {
    // TODO: Implement WebSocket data source
    // This would connect to the WebSocket and stream data updates
    console.warn('fromWebSocket not yet implemented');
    return this;
  }

  /**
   * Use polling as data source
   */
  fromPolling(_config: { url: string; interval?: number; transform?: (data: any) => T[] }): this {
    // TODO: Implement polling data source
    // This would poll the URL at regular intervals and update the chart
    console.warn('fromPolling not yet implemented');
    return this;
  }

  /**
   * Use Server-Sent Events as data source
   */
  fromEventSource(_config: { url: string; transform?: (data: any) => T[] }): this {
    // TODO: Implement EventSource data source
    // This would listen to server-sent events and update the chart
    console.warn('fromEventSource not yet implemented');
    return this;
  }

  /**
   * Apply custom configuration for advanced use cases
   */
  withCustomConfig(config: Partial<BubbleChartOptions>): this {
    this.options = { ...this.options, ...config };
    return this;
  }

  /**
   * Build and render the chart
   */
  render(): BubbleChart<T> {
    // Handle tree charts with hierarchical data specially
    if (this.options.type === 'tree' && this.dataSource && !Array.isArray(this.dataSource)) {
      // For tree charts with hierarchical data, bypass the store and use TreeBuilder directly
      const config: BubbleChartOptions = {
        container: this.container,
        type: 'tree',
        label: this.options.label ?? 'label',
        size: this.options.size ?? 'amount',
        color: this.options.color,
        width: this.options.width,
        height: this.options.height,
        animation: this.options.animations,
        ...this.options
      } as unknown as BubbleChartOptions;

      const treeBuilder = new TreeBuilder(config);
      treeBuilder.data(this.dataSource as any).render();
      
      // Create a facade that wraps the tree builder
      const chart = new BubbleChartFacade(this.container, { 
        ...this.options, 
        type: 'tree',
        ...(this.keyFunction && { key: this.keyFunction }) 
      });
      
      // Don't add to store for tree charts - TreeBuilder handles data internally
      return chart;
    } else {
      // Normal flow for flat data or array data
      const chart = new BubbleChartFacade(this.container, {
        ...this.options,
        ...(this.keyFunction && { key: this.keyFunction })
      });
      
      // Initialize the chart first to ensure builder is ready for streaming updates
      if (this.dataSource) {
        // Ensure we have array data for initial render
        const arrayData = Array.isArray(this.dataSource) ? this.dataSource : [this.dataSource];
        chart.store.addMany(arrayData); // Add data to the store
        chart.render(); // Then render the chart with the data
      } else {
        chart.render(); // Initialize even without data
      }
      
      return chart;
    }
  }
}
