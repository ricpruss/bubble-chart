/**
 * Core Building Blocks for Bubble Chart Library
 * Centralized exports for all common functionality
 */

// SVG Management
export { SVGManager, type SVGElements, type SVGDimensions } from './svg-manager.js';

// Data Processing
export { 
  DataProcessor, 
  type ProcessedDataPoint 
} from './data-processor.js';

// Interaction Management
export { 
  InteractionManager, 
  type TooltipManager 
} from './interaction-manager.js';

// Rendering Pipeline
export { 
  RenderingPipeline, 
  type RenderingContext, 
  type BubbleElements, 
  type LayoutNode 
} from './rendering-pipeline.js';

/**
 * Base Chart Builder using common building blocks
 * Provides a foundation that specialized builders can extend
 */
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig } from '../types/config.js';
import type { BubbleEventHandlers } from '../types/events.js';
import { SVGManager } from './svg-manager.js';
import { DataProcessor } from './data-processor.js';
import { InteractionManager } from './interaction-manager.js';
import { RenderingPipeline } from './rendering-pipeline.js';

/**
 * Modern base builder using compositional architecture
 * Eliminates duplication by using common building blocks
 */
export abstract class BaseChartBuilder<T extends BubbleChartData = BubbleChartData> {
  protected svgManager: SVGManager;
  protected dataProcessor: DataProcessor<T>;
  protected interactionManager!: InteractionManager<T>;
  protected renderingPipeline!: RenderingPipeline<T>;
  
  protected chartData: T[] = [];
  protected processedData: any[] = [];
  protected isInitialized = false;

  constructor(protected config: BubbleChartConfig) {
    this.svgManager = new SVGManager();
    this.dataProcessor = new DataProcessor<T>(config);
  }

  /**
   * Set data and trigger processing
   * @param data - Raw data array
   * @returns this for method chaining
   */
  data(data: T[]): this {
    // Validate input data
    if (!data) {
      console.warn('BubbleChart: No data provided');
      this.chartData = [];
      this.processedData = [];
      return this;
    }

    if (!Array.isArray(data)) {
      console.error('BubbleChart: Data must be an array, received:', typeof data, data);
      this.chartData = [];
      this.processedData = [];
      return this;
    }

    this.chartData = data;
    this.processedData = this.dataProcessor.process(data);
    return this;
  }

  /**
   * Register event handlers
   * @param eventType - Type of event
   * @param handler - Event handler function
   * @returns this for method chaining
   */
  on<K extends keyof BubbleEventHandlers<T>>(
    eventType: K,
    handler: BubbleEventHandlers<T>[K]
  ): this {
    // Ensure we have an interaction manager
    if (!this.interactionManager) {
      // Initialize components if needed for event registration
      if (!this.isInitialized) {
        this.initialize();
      } else {
        this.initializeInteractionManager();
      }
    }
    
    this.interactionManager.registerEventHandlers({
      [eventType]: handler
    } as Partial<BubbleEventHandlers<T>>);
    
    return this;
  }

  /**
   * Render the chart
   * @returns this for method chaining
   */
  render(): this {
    if (!this.chartData.length) return this;

    // Initialize components if not already done
    if (!this.isInitialized) {
      this.initialize();
    } else {
      // Clear previous content before re-rendering
      this.clearChart();
    }

    // Delegate to specialized render method
    this.performRender();
    
    return this;
  }

  /**
   * Update chart with new data or configuration
   * @param data - Optional new data
   * @returns this for method chaining
   */
  update(data?: T[]): this {
    if (data) {
      this.data(data);
    }
    this.render();
    return this;
  }

  /**
   * Initialize all building blocks
   */
  private initialize(): void {
    // Initialize SVG
    const svgElements = this.svgManager.initialize(this.config);
    
    // Initialize rendering pipeline
    this.renderingPipeline = new RenderingPipeline<T>({
      svg: svgElements.svg,
      width: svgElements.dimensions.width,
      height: svgElements.dimensions.height,
      config: this.config
    });

    // Initialize interaction manager
    this.initializeInteractionManager();

    this.isInitialized = true;
  }

  /**
   * Initialize interaction manager
   */
  private initializeInteractionManager(): void {
    const svgElements = this.svgManager.getElements();
    if (svgElements) {
      this.interactionManager = new InteractionManager<T>(
        this.config,
        svgElements.svg
      );
    }
  }

  /**
   * Clear previous chart content for re-rendering
   */
  private clearChart(): void {
    const svgElements = this.svgManager.getElements();
    if (svgElements) {
      // Clear all bubble elements (RenderingPipeline adds them directly to SVG)
      svgElements.svg.selectAll('.bubble').remove();
      // Also clear main group content
      svgElements.mainGroup.selectAll('*').remove();
    }
  }

  /**
   * Abstract method for specialized rendering logic
   * Subclasses must implement this method
   */
  protected abstract performRender(): void;

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): BubbleChartConfig {
    return this.config;
  }

  /**
   * Update configuration
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  setConfig(newConfig: Partial<BubbleChartConfig>): this {
    this.config = { ...this.config, ...newConfig };
    
    // Update rendering pipeline context if it exists
    if (this.renderingPipeline) {
      this.renderingPipeline = new RenderingPipeline<T>({
        svg: this.svgManager.getElements()?.svg,
        width: this.svgManager.getElements()?.dimensions.width || this.config.width || 500,
        height: this.svgManager.getElements()?.dimensions.height || this.config.height || 500,
        config: this.config
      });
    }
    
    // Update data processor with new config
    this.dataProcessor = new DataProcessor<T>(this.config);
    
    return this;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.svgManager?.destroy();
    this.interactionManager?.destroy();
    this.chartData = [];
    this.processedData = [];
    this.isInitialized = false;
  }
} 