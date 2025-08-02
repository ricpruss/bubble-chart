/**
 * Base Chart Builder - Foundation for all chart types
 * Uses unified types and consolidated pipeline for consistent behavior
 */

import * as d3 from 'd3';
import type { 
  BubbleChartData, 
  BubbleChartOptions, 
  ChartHandle, 
  BubbleEventHandlers,
  ProcessedDataPoint
} from '../types.js';
import { SVGManager } from './svg-manager.js';
import { InteractionManager } from './interaction-manager.js';
import { RenderingPipeline } from './rendering-pipeline.js';
import { ChartPipeline } from './pipeline.js';

/**
 * Base chart builder with core functionality
 * Provides SVG management, data processing, and rendering pipeline
 * All chart types inherit from this foundation
 */
export abstract class BaseChartBuilder<T extends BubbleChartData = BubbleChartData> implements ChartHandle<T> {
  protected config: BubbleChartOptions;
  protected chartData: T[] = [];
  protected processedData: ProcessedDataPoint<T>[] = [];
  protected isInitialized = false;
  private textColor: string = 'white';

  // Building blocks - initialized on first use
  protected svgManager!: SVGManager;
  protected renderingPipeline!: RenderingPipeline<T>;
  protected interactionManager!: InteractionManager<T>;

  constructor(config: BubbleChartOptions) {
    this.config = config;
    
    // Initialize SVG manager immediately
    this.svgManager = new SVGManager();
  }

  /**
   * Set data and trigger processing using ChartPipeline
   * @param data - Raw data array
   * @returns this for method chaining
   */
  data(data: T[]): this {
    // Validate input data
    if (!data) {
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
    this.processedData = ChartPipeline.processData(data, this.config);
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
    
    // Initialize SVG
    const svgElements = this.svgManager.initialize(this.config);
    
    // Set up responsive behavior if configured
    if (this.config.responsive) {
      this.svgManager.makeResponsive(
        this.config.responsive,
        undefined, // callback parameter
        () => this.performRender() // re-render callback for responsive updates
      );
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
      // Interrupt any ongoing transitions before removal
      svgElements.svg.selectAll('.bubble').interrupt();
      svgElements.mainGroup.selectAll('*').interrupt();
      
      // Remove elements
      svgElements.svg.selectAll('.bubble').remove();
      svgElements.mainGroup.selectAll('*').remove();
    }
  }

  /**
   * Get readonly merged options (unified API)
   */
  options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze({ ...this.config } as BubbleChartOptions<T>);
  }

  /**
   * Merge-update options (unified API)
   */
  updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
    // Re-process data with new config if we have data
    if (this.chartData.length) {
      this.processedData = ChartPipeline.processData(this.chartData, this.config);
    }
    
    // Update rendering pipeline context if it exists
    if (this.renderingPipeline && this.svgManager.getElements()) {
      const svgElements = this.svgManager.getElements()!;
      this.renderingPipeline = new RenderingPipeline<T>({
        svg: svgElements.svg,
        width: svgElements.dimensions.width,
        height: svgElements.dimensions.height,
        config: this.config
      });
    }
    
    return this;
  }

  /**
   * Destroy the chart and clean up resources
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
   */
  getTextColor(): string {
    return this.textColor;
  }

  /**
   * Set the text color for labels
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