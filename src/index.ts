import * as d3 from 'd3';
import { ConfigBuilder } from './config-builder.js';
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
  BubbleChartConfig, 
  BubbleChartOptions,
  ChartType 
} from './types/index.js';

import type {
  BubbleEventType,
  BubbleEventHandlers
} from './types/events.js';

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
export class BubbleChart<T extends BubbleChartData = BubbleChartData> {
  /**
   * Configuration builder instance
   */
  private config: ConfigBuilder;

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
    this.config = new ConfigBuilder();
    
    // Merge user options with default configuration
    this.mergeOptions(options);

    // Initialize the appropriate builder based on chart type
    this.initializeBuilder();
  }

  /**
   * Merge user options with the default configuration
   * @param options - User-provided options to merge
   */
  private mergeOptions(options: Partial<BubbleChartOptions<T>>): void {
    // Guard against undefined or null options
    if (!options || typeof options !== 'object') {
      return;
    }

    const configObject = this.config.getConfig();
    
    for (const [key, value] of Object.entries(options)) {
      if (key === 'format' && typeof value === 'object' && value !== null) {
        // Merge format functions
        configObject.format = { ...configObject.format, ...value };
      } else if (typeof (configObject as any)[key] === 'object' && 
                 (configObject as any)[key] !== null &&
                 typeof value === 'object' && value !== null) {
        // Deep merge object properties
        (configObject as any)[key] = { 
          ...(configObject as any)[key], 
          ...value 
        };
      } else {
        // Direct assignment for primitive values
        (configObject as any)[key] = value;
      }
    }

    // Update the config builder with merged options
    this.config.setOptions(configObject);
  }

  /**
   * Initialize the appropriate chart builder based on configuration type
   */
  private initializeBuilder(): void {
    const configObject = this.config.getConfig();
    
    switch (configObject.type) {
      case 'tree':
        this.builder = new TreeBuilder<T>(configObject);
        break;
      case 'wave':
        this.builder = new WaveBubble<T>(configObject);
        break;
      case 'orbit':
        this.builder = new OrbitBuilder<T>(configObject);
        break;
      case 'list':
        this.builder = new ListBuilder<T>(configObject);
        break;
      case 'motion':
        this.builder = new MotionBubble<T>(configObject);
        break;
      case 'liquid':
        this.builder = new LiquidBubble<T>(configObject);
        break;
      default:
        this.builder = new BubbleBuilder<T>(configObject);
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
   * Get the current chart configuration
   * @returns Current chart configuration
   */
  getConfig(): BubbleChartConfig {
    return this.config.getConfig();
  }

  /**
   * Update chart configuration
   * @param options - Partial configuration options to merge
   * @returns This instance for method chaining
   */
  configure(options: Partial<BubbleChartOptions<T>>): this {
    this.mergeOptions(options);
    
    // Re-initialize builder if chart type changed
    const newType = options.type;
    if (newType && newType !== this.getConfig().type) {
      this.initializeBuilder();
    }
    
    return this;
  }

  /**
   * Get the chart type
   * @returns Current chart type
   */
  getType(): ChartType {
    return this.getConfig().type || 'none';
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
  BubbleChartConfig,
  BubbleChartOptions,
  ChartType,
  BubbleEventType,
  BubbleEventHandlers
} from './types/index.js';

// Re-export individual builders for advanced usage
export {
  ConfigBuilder,
  BubbleBuilder,
  TreeBuilder,
  MotionBubble,
  WaveBubble,
  LiquidBubble,
  OrbitBuilder,
  ListBuilder
}; 