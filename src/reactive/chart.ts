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
import { type BubbleChartOptionsExtended } from './reactive-config.js';
// Import BubbleChartBuilder from extracted module
import { BubbleChartBuilder } from './bubble-chart-builder.js';
export { BubbleChartBuilder } from './bubble-chart-builder.js';


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
  setAnimation(animation: Partial<AnimationConfig>): this;
  setAnimations(preset: AnimationPresetName | AnimationConfig): this;
  
  // Data configuration
  setSizeMetric(field: string): this;
  setTooltip(mode: TooltipMode | TooltipConfig | string[]): this;
  
  // Data analysis and rendering
  inspectData(): DataIntelligenceInsights;
  redraw(): this;
  destroy(): void;
}

export class BubbleChartFacade<T extends BubbleChartData = BubbleChartData> implements BubbleChart<T> {
  public readonly store: DataStore<T>;
  private builder: BubbleBuilder<T> | TreeBuilder<T> | OrbitBuilder<T> | MotionBubble<T> | ListBuilder<T> | WaveBubble<T> | LiquidBubble<T>;
  private listeners: Map<EventName, Set<EventHandler>> = new Map();
  private isInitialized: boolean;

  private animations: AnimationConfig | undefined;
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
    console.log('BubbleChartFacade: Creating builder for type:', config.type);
    if (config.type === 'orbit') {
      this.builder = new OrbitBuilder<T>(config);
      console.log('BubbleChartFacade: Created OrbitBuilder');
    } else if (config.type === 'tree') {
      this.builder = new TreeBuilder<T>(config);
      console.log('BubbleChartFacade: Created TreeBuilder');
    } else if (config.type === 'motion') {
      this.builder = new MotionBubble<T>(config);
      console.log('BubbleChartFacade: Created MotionBubble');
    } else if (config.type === 'list') {
      this.builder = new ListBuilder<T>(config);
      console.log('BubbleChartFacade: Created ListBuilder');
    } else if (config.type === 'wave') {
      this.builder = new WaveBubble<T>(config);
      console.log('BubbleChartFacade: Created WaveBubble');
    } else if (config.type === 'liquid') {
      this.builder = new LiquidBubble<T>(config);
      console.log('BubbleChartFacade: Created LiquidBubble');
    } else {
      this.builder = new BubbleBuilder<T>(config);
      console.log('BubbleChartFacade: Created default BubbleBuilder');
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
    console.log('BubbleChartFacade: render() called with', currentData.length, 'data items');
    console.log('BubbleChartFacade: builder type:', this.builder.constructor.name);
    // Always render, even with empty data to initialize the builder
    this.builder.data(currentData).render();
    this.isInitialized = true;
    console.log('BubbleChartFacade: render() completed');
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

  setAnimation(animation: Partial<AnimationConfig>): this {
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
    // Update the builder configuration
    this.builder.updateOptions({ size: field });
    
    // Get current data from store
    const currentData = [...this.store.data()] as T[];
    
    // Force reprocessing with new size field by calling data() then render()
    // This ensures the radius scale is recalculated with the new size field
    this.builder.data(currentData).render();
    
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
 * Updated to use extracted BubbleChartBuilder
 */
export class BubbleChart {
  /**
   * Create a new bubble chart with intelligent configuration
   * @deprecated Use createChart from fluent-api.ts for new development
   */
  static create(container: string): any {
    // Use the imported BubbleChartBuilder
    return new BubbleChartBuilder(container);
  }
}
