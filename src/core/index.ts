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

// Note: Complex animation engines removed in favor of D3's elegant alpha system
// MotionBubble uses D3's built-in continuous animation with alphaTarget > 0


/**
 * Core chart building system
 * Unified base classes and components for all chart types
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import type { BubbleEventHandlers } from '../events/index.js';
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
  private textColor: string = 'white';  // Default text color
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

  // render() method removed - D3-native approach uses update() only

  /**
   * Update chart with new data or configuration
   * @param data - Optional new data
   * @returns this for method chaining
   */
  update(data?: T[]): this {
    if (data) {
      this.data(data);
    }
    
    // D3-native approach: only initialize if needed, then perform direct update
    if (!this.isInitialized) {
      this.initialize();
    }
    
    // Direct performRender call - no clearing, pure D3 data joins
    if (this.chartData.length) {
      this.performRender();
    } else {
      this.clearChart();
    }
    
    return this;
  }

  /**
   * Initialize all building blocks
   */
  private initialize(): void {
    // Set responsive options BEFORE initializing SVG
    if (this.config.responsive) {
      this.svgManager.setResponsiveOptions(this.config.responsive);
    }
    
    // Initialize SVG (svgManager already created in constructor)
    const svgElements = this.svgManager.initialize(this.config);
    
    // Set up responsive behavior if configured
    if (this.config.responsive) {
      this.svgManager.makeResponsive(this.config.responsive);
    }
    
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
   * Get the current text color
   * @returns Current text color
   */
  getTextColor(): string {
    return this.textColor;
  }

  /**
   * Set the text color for labels
   * @param color - Text color as a string
   * @returns this for method chaining
   */
  setTextColor(color: string): this {
    this.textColor = color;
    return this;
  }

  /**
   * Protected method for subclasses to implement their specific rendering logic
   */
  protected abstract performRender(): void;
} 