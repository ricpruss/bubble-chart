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
  type LayoutNode 
} from './rendering-pipeline.js';

/**
 * Core chart building system
 * Unified base classes and components for all chart types
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, ChartHandle } from '../types/config.js';
import type { BubbleEventHandlers } from '../types/events.js';
import { SVGManager } from './svg-manager.js';
import { DataProcessor } from './data-processor.js';
import { InteractionManager } from './interaction-manager.js';
import { RenderingPipeline } from './rendering-pipeline.js';

/**
 * Base chart builder with core functionality
 * Provides SVG management, data processing, and rendering pipeline
 * All chart types inherit from this foundation
 */
export abstract class BaseChartBuilder<T extends BubbleChartData = BubbleChartData> implements ChartHandle<T> {
  protected config: BubbleChartOptions;
  protected chartData: T[] = [];
  protected processedData: any[] = [];
  protected isInitialized = false;
  
  // Building blocks - initialized on first use
  protected svgManager!: SVGManager;
  protected dataProcessor!: DataProcessor<T>;
  protected renderingPipeline!: RenderingPipeline<T>;
  protected interactionManager!: InteractionManager<T>;

  constructor(config: BubbleChartOptions) {
    this.config = config;
    
    // Initialize core building blocks immediately
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
      // Silently handle null/undefined data (no warning for performance tests)
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
    console.log('BaseChartBuilder: render() called, class:', this.constructor.name);
    console.log('BaseChartBuilder: chartData length:', this.chartData.length);
    console.log('BaseChartBuilder: isInitialized:', this.isInitialized);
    
    // Initialize components if not already done (even with empty data)
    if (!this.isInitialized) {
      console.log('BaseChartBuilder: Initializing...');
      this.initialize();
    } else {
      // Clear previous content before re-rendering
      console.log('BaseChartBuilder: Clearing chart...');
      this.clearChart();
    }

    // Only perform actual rendering if we have data
    if (this.chartData.length) {
      console.log('BaseChartBuilder: Calling performRender() on', this.constructor.name);
      // Delegate to specialized render method
      this.performRender();
    } else {
      console.log('BaseChartBuilder: No data to render');
    }
    
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
    // Initialize SVG (svgManager already created in constructor)
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
      // Interrupt any ongoing transitions before removal to prevent interference
      svgElements.svg.selectAll('.bubble').interrupt();
      svgElements.mainGroup.selectAll('*').interrupt();
      
      // Now safely remove elements
      svgElements.svg.selectAll('.bubble').remove();
      svgElements.mainGroup.selectAll('*').remove();
    }
  }

  /**
   * Get readonly merged options (unified API)
   * @returns Readonly configuration options
   */
  options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze({ ...this.config } as BubbleChartOptions<T>);
  }

  /**
   * Merge-update options (unified API)
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
    // Update building blocks with new config
    if (this.dataProcessor) {
      this.dataProcessor = new DataProcessor<T>(this.config);
      if (this.chartData.length) {
        this.processedData = this.dataProcessor.process(this.chartData);
      }
    }
    
    // Update rendering pipeline context if it exists
    if (this.renderingPipeline) {
      this.renderingPipeline = new RenderingPipeline<T>({
        svg: this.svgManager.getElements()?.svg,
        width: this.svgManager.getElements()?.dimensions.width || this.config.width || 500,
        height: this.svgManager.getElements()?.dimensions.height || this.config.height || 500,
        config: this.config
      });
    }
    
    return this;
  }

  /**
   * Destroy the chart and clean up resources
   * @description Removes event listeners, stops simulations, and clears SVG content
   */
  destroy(): void {
    // Clean up D3 timers and transitions
    d3.selectAll('.bubble').interrupt();
    
    // Clear container
    if (this.config.container) {
      const container = d3.select(this.config.container);
      container.selectAll('*').remove();
    }
    
    // Clear arrays to prevent memory leaks
    this.chartData = [];
    this.processedData = [];
    
    // Clean up building blocks
    if (this.svgManager && typeof (this.svgManager as any).destroy === 'function') {
      (this.svgManager as any).destroy();
    }
    if (this.interactionManager && typeof (this.interactionManager as any).destroy === 'function') {
      (this.interactionManager as any).destroy();
    }
    
    this.isInitialized = false;
  }

  /**
   * Protected method for subclasses to implement their specific rendering logic
   */
  protected abstract performRender(): void;
} 