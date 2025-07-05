import * as d3 from 'd3';
import { BubbleBuilder } from './bubble-builder.js';
import { TreeBuilder } from './tree-builder.js';
import { OrbitBuilder } from './orbit-builder.js';
import { ListBuilder } from './list-builder.js';
import { MotionBubble } from './motion-bubble.js';
import { WaveBubble } from './wave-bubble.js';
import { LiquidBubble } from './liquid-bubble.js';

// Import our comprehensive type system
import type { 
  BubbleChartData, 
  BubbleChartOptions,
  ChartHandle,
  ChartType 
} from './types/index.js';

import type {
  BubbleEventType,
  BubbleEventHandlers
} from './types/events.js';

import { createDefaultConfig } from './types/config.js';

// Export common building blocks for advanced usage
export {
  SVGManager,
  DataProcessor,
  InteractionManager,
  RenderingPipeline,
  BaseChartBuilder,
  type SVGElements,
  type SVGDimensions,
  type ProcessedDataPoint,
  type TooltipManager,
  type RenderingContext,
  type BubbleElements,
  type LayoutNode
} from './core/index.js';

// Export reactive functionality
export {
  DataStore,

  BubbleChart as ReactiveBubbleChart,
  BubbleChartBuilder,
  ReactiveBubbleBuilder,
  type IBubbleChart,
  type BubbleChartOptions as ReactiveBubbleChartOptions,
  type ChangeStats,
  // Phase 2A: Core API Enhancement exports
  DataIntelligence,
  type DataIntelligenceInsights,
  type DataFieldAnalysis,
  type DataQualityIssue,
  AnimationPresets,
  type AnimationConfig,
  type AnimationPresetName,
  SmartTooltips,
  type TooltipContent
} from './reactive/index.js';



/**
 * Modern Bubble Chart visualization library with TypeScript support
 * 
 * Provides a unified API for creating various types of bubble charts:
 * - Basic bubble charts
 * - Tree/hierarchical layouts  
 * - Motion bubbles with physics
 * - Wave-filled bubbles
 * - Liquid gauge bubbles
 * - Orbital motion bubbles
 * - List-style rankings
 * 
 * Features:
 * - Full TypeScript support with comprehensive type safety
 * - Method chaining API
 * - Event handling system
 * - Responsive design
 * - Multiple export formats (CommonJS, ESM, UMD)
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class BubbleChart<T extends BubbleChartData = BubbleChartData> implements ChartHandle<T> {
  /**
   * Configuration instance
   */
  private config: BubbleChartOptions<T>;

  /**
   * Current chart builder instance
   */
  private builder?: BubbleBuilder<T> | TreeBuilder<T> | MotionBubble<T> | 
                    WaveBubble<T> | LiquidBubble<T> | OrbitBuilder<T> | ListBuilder<T> | undefined;

  /**
   * Create a new BubbleChart instance
   * @param options - Configuration options for the chart
   */
  constructor(options: Partial<BubbleChartOptions<T>> = {}) {
    // Start with default configuration and merge user options
    this.config = { ...createDefaultConfig(), ...options } as BubbleChartOptions<T>;

    // Initialize the appropriate builder based on chart type
    this.initializeBuilder();
  }



  /**
   * Initialize the appropriate chart builder based on configuration type
   */
  private initializeBuilder(): void {
    switch (this.config.type) {
      case 'tree':
        this.builder = new TreeBuilder<T>(this.config as any);
        break;
      case 'wave':
        this.builder = new WaveBubble<T>(this.config as any);
        break;
      case 'orbit':
        this.builder = new OrbitBuilder<T>(this.config as any);
        break;
      case 'list':
        this.builder = new ListBuilder<T>(this.config as any);
        break;
      case 'motion':
        this.builder = new MotionBubble<T>(this.config as any);
        break;
      case 'liquid':
        this.builder = new LiquidBubble<T>(this.config as any);
        break;
      default:
        this.builder = new BubbleBuilder<T>(this.config as any);
    }
  }

  /**
   * Set visualization data
   * @param data - Array of data objects to visualize
   * @returns This instance for method chaining
   */
  data(data: T[]): this {
    if (!this.builder) {
      throw new Error('Chart builder not initialized');
    }
    
    this.builder.data(data);
    return this;
  }

  /**
   * Add event listener for chart interactions
   * @param event - Event type to listen for
   * @param handler - Event handler function
   * @returns This instance for method chaining
   */
  on<K extends BubbleEventType>(
    event: K, 
    handler: BubbleEventHandlers<T>[K]
  ): this {
    if (!this.builder) {
      throw new Error('Chart builder not initialized');
    }

    this.builder.on(event, handler);
    return this;
  }

  /**
   * Update the chart with new data or force re-render
   * @param data - Optional new data to set before updating
   * @returns This instance for method chaining
   */
  update(data?: T[]): this {
    if (!this.builder) {
      throw new Error('Chart builder not initialized');
    }

    if (data) {
      this.data(data);
    }
    
    this.builder.update();
    return this;
  }

  /**
   * Render the chart (if not already rendered)
   * @returns This instance for method chaining
   */
  render(): this {
    if (!this.builder) {
      throw new Error('Chart builder not initialized');
    }

    this.builder.render();
    return this;
  }

  /**
   * Get readonly merged options (unified API)
   * @returns Readonly configuration options
   */
  options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Merge-update options (unified API)
   * @param options - Partial configuration to merge
   * @returns this for method chaining
   */
  updateOptions(options: Partial<BubbleChartOptions<T>>): this {
    const oldType = this.config.type;
    this.config = { ...this.config, ...options };
    
    // Re-initialize builder if chart type changed
    const newType = options.type;
    if (newType && newType !== oldType) {
      this.initializeBuilder();
    }
    
    return this;
  }



  /**
   * Get the chart type
   * @returns Current chart type
   */
  getType(): ChartType {
    return this.config.type || 'none';
  }

  /**
   * Get the underlying builder instance (for advanced usage)
   * @returns The current chart builder
   */
  getBuilder(): typeof this.builder {
    return this.builder;
  }

  /**
   * Set orbital speed multiplier (only works for orbit chart type)
   * @param multiplier - Speed multiplier (0.1 = very slow, 1.0 = normal, 2.0 = fast)
   * @returns This instance for method chaining
   */
  setOrbitSpeed(multiplier: number): this {
    if (this.getType() === 'orbit' && this.builder) {
      // Type assertion since we know it's an OrbitBuilder when type is 'orbit'
      const orbitBuilder = this.builder as any;
      if (typeof orbitBuilder.setSpeedMultiplier === 'function') {
        orbitBuilder.setSpeedMultiplier(multiplier);
      }
    }
    return this;
  }

  /**
   * Get orbital speed multiplier (only works for orbit chart type)
   * @returns Current speed multiplier or null if not orbit type
   */
  getOrbitSpeed(): number | null {
    if (this.getType() === 'orbit' && this.builder) {
      const orbitBuilder = this.builder as any;
      if (typeof orbitBuilder.getSpeedMultiplier === 'function') {
        return orbitBuilder.getSpeedMultiplier();
      }
    }
    return null;
  }

  /**
   * Destroy the chart and clean up all resources
   * Removes DOM elements, stops animations, clears event listeners
   */
  destroy(): void {
    if (this.builder && typeof this.builder.destroy === 'function') {
      this.builder.destroy();
    }
    this.builder = undefined;
  }

  /**
   * Static method to create a BubbleChart instance
   * @param options - Configuration options
   * @returns New BubbleChart instance
   */
  static create<T extends BubbleChartData = BubbleChartData>(
    options?: Partial<BubbleChartOptions<T>>
  ): BubbleChart<T> {
    return new BubbleChart<T>(options);
  }

  /**
   * Get library version information
   * @returns Version string
   */
  static get version(): string {
    return '2.0.0';
  }

  /**
   * Check if D3.js is available
   * @returns True if D3.js is loaded
   */
  static get d3Available(): boolean {
    return typeof d3 !== 'undefined';
  }
}

// Export the main class as both named and default export for compatibility
export { BubbleChart as default };

// Re-export key types for external usage
export type {
  BubbleChartData,
  BubbleChartOptions,
  ChartType,
  BubbleEventType,
  BubbleEventHandlers
} from './types/index.js';

// Re-export individual builders for advanced usage
export {
  BubbleBuilder,
  TreeBuilder,
  MotionBubble,
  WaveBubble,
  LiquidBubble,
  OrbitBuilder,
  ListBuilder
};

// Export reactive functionality (Phase 1 implementation)
export * from './reactive/index.js'; 