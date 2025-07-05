import * as d3 from 'd3';
import { BubbleBuilder } from '../bubble-builder.js';
import { TreeBuilder } from '../tree-builder.js';
import { OrbitBuilder } from '../orbit-builder.js';
import { MotionBubble } from '../motion-bubble.js';
import { ListBuilder } from '../list-builder.js';
import { WaveBubble } from '../wave-bubble.js';
import { LiquidBubble } from '../liquid-bubble.js';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, StreamingOptions } from '../types/config.js';
import { DataStore, type KeyFunction } from './store.js';
import { DataIntelligence, type DataIntelligenceInsights } from './data-intelligence.js';
import { AnimationPresets, type AnimationPresetName } from './animation-presets.js';
import type { AnimationConfig } from '../types/config.js';
import { type TooltipConfig, type TooltipMode } from '../types/config.js';

export interface AnimationBlock {
  enter?: { duration: number; stagger?: number; easing?: string; delay?: number } | undefined;
  update?: { duration: number; easing?: string; delay?: number } | undefined;
  exit?: { duration: number; easing?: string; delay?: number } | undefined;
}

export interface BubbleChartOptionsExtended<T extends BubbleChartData = BubbleChartData> extends Partial<BubbleChartOptions> {
  key?: KeyFunction<T>;
  animations?: AnimationBlock;
}

export type EventName = 'change' | 'render' | 'destroy';
export type EventHandler = (payload: any) => void;

export interface BubbleChart<T extends BubbleChartData = BubbleChartData> {
  readonly store: DataStore<T>;
  
  // Unified API methods
  options(): Readonly<BubbleChartOptions<T>>;
  updateOptions(options: Partial<BubbleChartOptions<T>>): this;
  
  // Event handling
  on(event: EventName, handler: EventHandler): this;
  off(event: EventName, handler: EventHandler): this;
  
  // DOM event handling (forwarded to builder)
  onBubble(event: string, handler: (data: T, event: MouseEvent, element: SVGElement) => void): this;
  
  // Animation configuration
  setAnimation(animation: Partial<AnimationBlock>): this;
  setAnimations(preset: AnimationPresetName | AnimationConfig): this;
  
  // Data configuration
  setSizeMetric(field: string): this;
  setTooltip(mode: TooltipMode | TooltipConfig | string[]): this;
  
  // Data analysis and rendering
  inspectData(): DataIntelligenceInsights;
  redraw(): this;
  destroy(): void;
}

class BubbleChartFacade<T extends BubbleChartData = BubbleChartData> implements BubbleChart<T> {
  public readonly store: DataStore<T>;
  private builder: BubbleBuilder<T> | TreeBuilder<T> | OrbitBuilder<T> | MotionBubble<T> | ListBuilder<T> | WaveBubble<T> | LiquidBubble<T>;
  private listeners: Map<EventName, Set<EventHandler>> = new Map();
  private isInitialized: boolean;

  private animations: AnimationBlock | undefined;
  private keyFunction: KeyFunction<T> | undefined;

  constructor(container: string, options: BubbleChartOptionsExtended<T>) {
    // Build chart config
    const { key, animations, ...configRest } = options;
    
    // Convert animation configuration to the format expected by BubbleBuilder
    let animationConfig: AnimationConfig | undefined;
    if (animations) {
      animationConfig = animations;
    }
    
    const config: BubbleChartOptions = {
      container,
      label: configRest.label ?? 'name',
      size: configRest.size ?? 'value',
      animation: animationConfig,  // Pass animation config to builder
      ...configRest
    } as unknown as BubbleChartOptions;

    this.animations = animations;
    this.keyFunction = key;

    // Create the appropriate builder based on chart type
    if (config.type === 'orbit') {
      this.builder = new OrbitBuilder<T>(config);
    } else if (config.type === 'tree') {
      this.builder = new TreeBuilder<T>(config);
    } else if (config.type === 'motion') {
      this.builder = new MotionBubble<T>(config);
    } else if (config.type === 'list') {
      this.builder = new ListBuilder<T>(config);
    } else if (config.type === 'wave') {
      this.builder = new WaveBubble<T>(config);
    } else if (config.type === 'liquid') {
      this.builder = new LiquidBubble<T>(config);
    } else {
      this.builder = new BubbleBuilder<T>(config);
    }
    
    this.store = new DataStore<T>([], key);

    // Ensure builder is initialized before any streaming updates
    this.isInitialized = false;

    this.store.on((stats) => {
      // Skip streaming updates if builder not initialized
      if (!this.isInitialized) {
        return;
      }
      
      // Use streaming-aware redraw for smooth incremental updates
      const currentData = [...this.store.data()] as T[];
      
      // Special handling for motion/orbit bubbles - they use physics simulations, not streaming updates
      // TODO: Implement streaming-aware physics simulations for motion/orbit charts (see REACTIVE_IMPLEMENTATION.md)
      if (this.builder instanceof MotionBubble) {
        // Motion bubbles have their own continuous d3-force animation system
        // Currently falls back to full re-render instead of streaming updates
        this.builder.data(currentData).render();
      }
      else if (this.builder instanceof OrbitBuilder) {
        // Orbit bubbles have their own continuous d3-timer animation system  
        // Currently falls back to full re-render instead of streaming updates
        this.builder.data(currentData).render();
      }
      // If we have animation presets, use streaming update for proper stagger control
      else if (this.animations) {
        // Convert animation presets to streaming options
        // Note: Don't provide update duration - let rendering pipeline calculate optimal timing
        const enterDuration = this.animations.enter?.duration || 800;
        const staggerDelay = this.animations.enter?.stagger || 0;
        
        const streamingOptions: StreamingOptions = {
          enterAnimation: {
            duration: enterDuration,
            staggerDelay: staggerDelay,
            easing: this.animations.enter?.easing || 'ease-out'
          },
          updateAnimation: {
            // Let rendering pipeline calculate optimal duration based on enter timing
            duration: this.animations.update?.duration || 0, // 0 will trigger auto-calculation
            easing: this.animations.update?.easing || 'ease-in-out'
          },
          exitAnimation: {
            duration: this.animations.exit?.duration || 400,
            easing: this.animations.exit?.easing || 'ease-in'
          },
          keyFunction: this.keyFunction || ((d: any) => d.id || d.name || JSON.stringify(d))
        };
        
        // Use streaming update with proper animation options
        try {
          // Process data without triggering builder's render
          this.builder.data(currentData);
          const processedData = (this.builder as any).processedData;
          
          // Get the rendering pipeline from the builder
          const renderingPipeline = (this.builder as any).renderingPipeline;
          
          // Ensure builder is initialized before attempting streaming update
          if (!renderingPipeline || !(this.builder as any).isInitialized) {
            throw new Error('Builder not fully initialized - falling back to builder render');
          }
          
          // Perform streaming update with animation presets (no builder render)
          renderingPipeline.streamingUpdate(processedData, streamingOptions);
          
          // Re-attach events to all bubbles (including newly added ones)
          // Use a small delay to ensure DOM has been updated
          setTimeout(() => {
            this.reattachEventsToExistingBubbles();
          }, 10);
        } catch (error) {
          // Fallback: Use builder render with rich animation config
          console.warn('Streaming update failed, falling back to builder render:', error);
          const originalAnimation = this.builder.options().animation;
          this.builder.updateOptions({ animation: this.animations });
          this.builder.data(currentData).render();
          // Restore original animation config
          if (originalAnimation) {
            this.builder.updateOptions({ animation: originalAnimation });
          }
        }
      } else {
        // Use regular builder render if no streaming animations configured
        this.builder.data(currentData).render();
      }
      
      this.emit('change', stats);
      this.emit('render', undefined);
    });
  }

  /**
   * Get readonly merged options (unified API)
   */
  options(): Readonly<BubbleChartOptions<T>> {
    return this.builder.options() as any;
  }

  /**
   * Update options (unified API)
   */
  updateOptions(options: Partial<BubbleChartOptions<T>>): this {
    this.builder.updateOptions(options);
    return this;
  }

  /**
   * Render the chart and mark as initialized
   */
  render(): this {
    const currentData = [...this.store.data()] as T[];
    // Always render, even with empty data to initialize the builder
    this.builder.data(currentData).render();
    this.isInitialized = true;
    return this;
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

  onBubble(event: string, handler: (data: T, event: MouseEvent, element: SVGElement) => void): this {
    // Forward DOM events to the underlying builder
    if (this.builder && typeof this.builder.on === 'function') {
      this.builder.on(event as any, handler as any);
      
      // Re-attach events to existing bubbles if chart is already rendered
      this.reattachEventsToExistingBubbles();
    }
    return this;
  }

  /**
   * Re-attach events to existing bubbles (fixes timing issue)
   * Called when events are registered after chart is already rendered
   */
  private reattachEventsToExistingBubbles(): void {
    try {
      const builder = this.builder as any;
      if (!builder?.isInitialized || !builder.interactionManager) {
        return;
      }
      
      // Get existing bubble elements from the DOM
      const container = d3.select(this.builder.options().container);
      const bubbleGroups = container.selectAll('.bubble');
      
      if (bubbleGroups.size() > 0) {
        // Re-attach events to existing bubbles
        const processedData = builder.processedData || [];
        builder.interactionManager.attachBubbleEvents(bubbleGroups, processedData);
      }
    } catch (error) {
      // Silently ignore errors - this is a best-effort fix for timing issues
    }
  }

  setAnimation(animation: Partial<AnimationBlock>): this {
    this.animations = { ...this.animations, ...animation };
    // Apply to builder - convert to rich animation config, preserving stagger
    const animationSpeed = animation.update?.duration || animation.enter?.duration;
    if (animationSpeed) {
      const richConfig: AnimationConfig = {
        enter: { 
          duration: animationSpeed, 
          stagger: animation.enter?.stagger !== undefined ? animation.enter.stagger : (this.animations?.enter?.stagger || 0), 
          easing: animation.enter?.easing || 'ease-out', 
          delay: animation.enter?.delay || 0 
        },
        update: { 
          duration: animationSpeed, 
          easing: animation.update?.easing || 'ease-in-out', 
          delay: animation.update?.delay || 0 
        },
        exit: { 
          duration: Math.round(animationSpeed * 0.5), 
          easing: animation.exit?.easing || 'ease-in', 
          delay: animation.exit?.delay || 0 
        }
      };
      this.builder.updateOptions({ animation: richConfig });
    }
    return this;
  }

  setAnimations(preset: AnimationPresetName | AnimationConfig): this {
    if (typeof preset === 'string') {
      this.animations = AnimationPresets.get(preset);
    } else {
      this.animations = preset;
    }
    
    // Apply to builder - convert rich animation config directly
    if (this.animations) {
      this.builder.updateOptions({ animation: this.animations });
    }
    return this;
  }

  setSizeMetric(field: string): this {
    this.builder.updateOptions({ size: field });
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
        keyFunction: this.keyFunction || ((d: any) => d.id || d.name || JSON.stringify(d))
      };
      
      // Use streaming update with proper animation options
      try {
        // Process data without triggering builder's render
        this.builder.data(currentData);
        const processedData = (this.builder as any).processedData;
        
        // Get the rendering pipeline from the builder
        const renderingPipeline = (this.builder as any).renderingPipeline;
        
        // Ensure builder is initialized before attempting streaming update
        if (!renderingPipeline || !(this.builder as any).isInitialized || !this.isInitialized) {
          throw new Error('Builder not fully initialized for redraw - falling back to builder render');
        }
        
        // Perform streaming update with animation presets (no builder render)
        renderingPipeline.streamingUpdate(processedData, streamingOptions);
      } catch (error) {
        // Fallback: Use builder render with rich animation config
        console.warn('Streaming update failed, falling back to builder render with preset config:', error);
        const originalAnimation = this.builder.options().animation;
        this.builder.updateOptions({ animation: this.animations });
        this.builder.data(currentData).render();
        // Restore original animation config
        if (originalAnimation) {
          this.builder.updateOptions({ animation: originalAnimation });
        }
      }
    } else {
      // Use regular builder render if no animations - use default rich config
      const originalAnimation = this.builder.options().animation;
      const defaultAnimation: AnimationConfig = {
        enter: { duration: 800, stagger: 0, easing: 'ease-out', delay: 0 },
        update: { duration: 600, easing: 'ease-in-out', delay: 0 },
        exit: { duration: 400, easing: 'ease-in', delay: 0 }
      };
      this.builder.updateOptions({ animation: defaultAnimation });
      this.builder.data(currentData).render();
      // Restore original animation config
      if (originalAnimation) {
        this.builder.updateOptions({ animation: originalAnimation });
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

  /**
   * Set the speed multiplier for orbital motion (orbit charts only)
   * @param multiplier - Speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
   */
  setSpeedMultiplier(multiplier: number): this {
    if (this.builder && typeof (this.builder as any).setSpeedMultiplier === 'function') {
      (this.builder as any).setSpeedMultiplier(multiplier);
    } else {
      console.warn('setSpeedMultiplier is only available for orbit charts');
    }
    return this;
  }

  /**
   * Get the current speed multiplier (orbit charts only)
   * @returns Current speed multiplier
   */
  getSpeedMultiplier(): number {
    if (this.builder && typeof (this.builder as any).getSpeedMultiplier === 'function') {
      return (this.builder as any).getSpeedMultiplier();
    }
    return 1.0; // Default
  }
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
      const chart = new BubbleChartFacade<T>(this.container, { 
        ...this.options, 
        type: 'tree',
        ...(this.keyFunction && { key: this.keyFunction }) 
      });
      
      // Don't add to store for tree charts - TreeBuilder handles data internally
      return chart;
    } else {
      // Normal flow for flat data or array data
      const chart = new BubbleChartFacade<T>(this.container, {
        ...this.options,
        ...(this.keyFunction && { key: this.keyFunction })
      });
      
      // Initialize the chart first to ensure builder is ready for streaming updates
      if (this.dataSource) {
        // Ensure we have array data for initial render
        const arrayData = Array.isArray(this.dataSource) ? this.dataSource : [this.dataSource];
        chart.render(); // Initialize with empty data first
        chart.store.addMany(arrayData); // Then add data which will trigger streaming updates
      } else {
        chart.render(); // Initialize even without data
      }
      
      return chart;
    }
  }
} 