import * as d3 from 'd3';
import { BubbleBuilder } from '../bubble-builder.js';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig, StreamingOptions } from '../types/config.js';
import { DataStore, type KeyFunction } from './store.js';
import { DataIntelligence, type DataIntelligenceInsights } from './data-intelligence.js';
import { AnimationPresets, type AnimationConfig, type AnimationPresetName } from './animation-presets.js';
import { type TooltipConfig, type TooltipMode } from './smart-tooltips.js';

export interface AnimationBlock {
  enter?: { duration: number; stagger?: number; easing?: string; delay?: number } | undefined;
  update?: { duration: number; easing?: string; delay?: number } | undefined;
  exit?: { duration: number; easing?: string; delay?: number } | undefined;
}

export interface BubbleChartOptions<T extends BubbleChartData = BubbleChartData> extends Partial<BubbleChartConfig> {
  key?: KeyFunction<T>;
  animations?: AnimationBlock;
}

export type EventName = 'change' | 'render' | 'destroy';
export type EventHandler = (payload: any) => void;

export interface BubbleChart<T extends BubbleChartData = BubbleChartData> {
  readonly store: DataStore<T>;
  on(event: EventName, handler: EventHandler): this;
  off(event: EventName, handler: EventHandler): this;
  setAnimation(animation: Partial<AnimationBlock>): this;
  setAnimations(preset: AnimationPresetName | AnimationConfig): this;
  setSizeMetric(field: string): this;
  setTooltip(mode: TooltipMode | TooltipConfig | string[]): this;
  inspectData(): DataIntelligenceInsights;
  redraw(): this;
  destroy(): void;
}

class BubbleChartFacade<T extends BubbleChartData = BubbleChartData> implements BubbleChart<T> {
  public readonly store: DataStore<T>;
  private builder: BubbleBuilder<T>;
  private listeners: Map<EventName, Set<EventHandler>> = new Map();

  private animations: AnimationBlock | undefined;

  constructor(container: string, options: BubbleChartOptions<T>) {
    // Build chart config
    const { key, animations, ...configRest } = options;
    const config: BubbleChartConfig = {
      container,
      label: configRest.label ?? 'name',
      size: configRest.size ?? 'value',
      ...configRest
    } as unknown as BubbleChartConfig;

    this.animations = animations;

    this.builder = new BubbleBuilder<T>(config);
    this.store = new DataStore<T>([], key);

    // initial render if any data
    if (this.store.length()) {
      this.builder.data([...this.store.data()] as T[]).render();
    }

    this.store.on((stats) => {
      // update builder
      this.builder.data([...this.store.data()] as T[]).render();
      this.emit('change', stats);
      this.emit('render', undefined);
    });
  }

  on(event: EventName, handler: EventHandler): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return this;
  }

  off(event: EventName, handler: EventHandler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  setAnimation(animation: Partial<AnimationBlock>): this {
    this.animations = { ...this.animations, ...animation };
    // Apply to builder - prioritize update duration since most interactions are updates
    const animationSpeed = animation.update?.duration || animation.enter?.duration;
    if (animationSpeed) {
      this.builder.setConfig({ animation: { speed: animationSpeed, method: 'no-recursive' } });
    }
    return this;
  }

  setAnimations(preset: AnimationPresetName | AnimationConfig): this {
    if (typeof preset === 'string') {
      this.animations = AnimationPresets.get(preset);
    } else {
      this.animations = preset;
    }
    
    // Apply to builder - use update duration for data updates (most common operation)
    const animationSpeed = this.animations?.update?.duration || this.animations?.enter?.duration;
    if (animationSpeed) {
      this.builder.setConfig({ animation: { speed: animationSpeed, method: 'no-recursive' } });
    }
    return this;
  }

  setSizeMetric(field: string): this {
    this.builder.setConfig({ size: field });
    this.redraw();
    return this;
  }

  setTooltip(mode: TooltipMode | TooltipConfig | string[]): this {
    // For now, store the tooltip configuration
    // TODO: Integrate with the builder's tooltip system
    if (Array.isArray(mode)) {
      // Convert string array to TooltipConfig - store for future use
    } else if (typeof mode === 'string') {
      // Simple mode string - store for future use
    } else {
      // Full TooltipConfig - store for future use
    }
    return this;
  }

  inspectData(): DataIntelligenceInsights {
    const data = this.store.data();
    return DataIntelligence.inspectData([...data]);
  }

  redraw(): this {
    // Get the current data from store
    const currentData = [...this.store.data()] as T[];
    
    // If we have animation presets, use streaming update for proper stagger control
    if (this.animations) {
      // Convert animation presets to streaming options
      const streamingOptions: StreamingOptions = {
        enterAnimation: {
          duration: this.animations.enter?.duration || 800,
          staggerDelay: this.animations.enter?.stagger || 0,
          easing: this.animations.enter?.easing || 'ease-out'
        },
        updateAnimation: {
          duration: this.animations.update?.duration || 600,
          easing: this.animations.update?.easing || 'ease-in-out'
        },
        exitAnimation: {
          duration: this.animations.exit?.duration || 400,
          easing: this.animations.exit?.easing || 'ease-in'
        },
        keyFunction: (d: any) => d.id || d.name || JSON.stringify(d)
      };
      
      // Use streaming update with proper animation options
      try {
        // Process data without triggering builder's render
        this.builder.data(currentData);
        const processedData = (this.builder as any).processedData;
        
        // Get the rendering pipeline from the builder
        const renderingPipeline = (this.builder as any).renderingPipeline;
        
        // Perform streaming update with animation presets (no builder render)
        renderingPipeline.streamingUpdate(processedData, streamingOptions);
      } catch (error) {
        // Fallback: Use builder render with correct stagger delay
        console.warn('Streaming update failed, falling back to builder render with preset stagger:', error);
        const originalAnimation = this.builder.getConfig().animation;
        const enterStagger = this.animations.enter?.stagger || 0;
        this.builder.setConfig({ 
          animation: { 
            speed: this.animations.update?.duration || this.animations.enter?.duration || 800, 
            method: 'no-recursive',
            staggerDelay: enterStagger 
          } 
        });
        this.builder.data(currentData).render();
        // Restore original animation config
        if (originalAnimation) {
          this.builder.setConfig({ animation: originalAnimation });
        }
      }
    } else {
      // Use regular builder render if no animations - ensure no stagger
      const originalAnimation = this.builder.getConfig().animation;
      this.builder.setConfig({ 
        animation: { 
          speed: originalAnimation?.speed || 800, 
          method: originalAnimation?.method || 'no-recursive',
          staggerDelay: 0  // No stagger when no animation presets
        } 
      });
      this.builder.data(currentData).render();
      // Restore original animation config
      if (originalAnimation) {
        this.builder.setConfig({ animation: originalAnimation });
      }
    }
    
    return this;
  }

  destroy(): void {
    this.store.clear();
    this.builder.destroy();
    this.emit('destroy', undefined);
    this.listeners.clear();
  }

  private emit(event: EventName, payload: any): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export function createBubbleChart<T extends BubbleChartData = BubbleChartData>(
  container: string,
  options: BubbleChartOptions<T>
): BubbleChart<T> {
  return new BubbleChartFacade<T>(container, options);
}

/**
 * Enhanced factory method with intelligent defaults
 */
export class BubbleChart {
  /**
   * Create a new bubble chart with intelligent configuration
   */
  static create<T extends BubbleChartData = BubbleChartData>(container: string): BubbleChartBuilder<T> {
    return new BubbleChartBuilder<T>(container);
  }
}

/**
 * Fluent builder for creating bubble charts with intelligent defaults
 */
export class BubbleChartBuilder<T extends BubbleChartData = BubbleChartData> {
  private container: string;
  private dataSource?: T[];
  private options: BubbleChartOptions<T> = {};

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
   * Group data by a categorical field (auto-assigns colors)
   */
  groupBy(_field: string): this {
    // TODO: Implement grouping and color assignment
    return this;
  }

  /**
   * Enable streaming with intelligent defaults
   */
  enableStreaming(): this {
    // TODO: Implement streaming configuration
    return this;
  }

  /**
   * Set animation preset or custom configuration
   */
  setAnimations(preset: AnimationPresetName | AnimationConfig): this {
    if (typeof preset === 'string') {
      this.options.animations = AnimationPresets.get(preset);
    } else {
      this.options.animations = preset;
    }
    return this;
  }

  /**
   * Configure intelligent tooltips
   */
  setTooltips(_mode: TooltipMode | TooltipConfig): this {
    // Store tooltip configuration for later use
    return this;
  }

  /**
   * Build and render the chart
   */
  render(): BubbleChart<T> {
    const chart = createBubbleChart(this.container, this.options);
    
    if (this.dataSource) {
      chart.store.addMany(this.dataSource);
    }
    
    return chart;
  }
} 