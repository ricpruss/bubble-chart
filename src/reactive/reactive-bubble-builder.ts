/**
 * Reactive Bubble Builder
 * BubbleBuilder with reactive data capabilities
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig } from '../types/config.js';
import { ReactiveChartBuilder } from './reactive-chart-builder.js';
import { DataProcessor } from '../core/index.js';
import type { Observable } from './observable.js';

/**
 * Reactive version of BubbleBuilder
 */
export class ReactiveBubbleBuilder<T extends BubbleChartData = BubbleChartData> extends ReactiveChartBuilder<T> {

  /**
   * Creates a new ReactiveBubbleBuilder instance
   * @param config - Configuration object for the chart
   */
  constructor(config: BubbleChartConfig) {
    super(config);
  }

  /**
   * Enhanced bindTo method with automatic streaming enabled
   * @param source - Observable data source
   * @returns this for method chaining
   */
  override bindTo(source: Observable<T[]>): this {
    // Enable streaming by default for reactive bubble charts
    this.enableStreaming();
    
    // Call parent to setup reactive binding
    return super.bindTo(source);
  }

  /**
   * Override performStreamingUpdate for specialized bubble chart streaming
   * @returns Streaming update result
   */
  override performStreamingUpdate() {
    // If streaming not enabled, default to normal render logic
    if (!this.streamingEnabled) {
      this.performRender();
      return { entered: 0, updated: 0, exited: 0 };
    }

    // Ensure the chart is initialised so renderingPipeline exists
    if (!this.renderingPipeline) {
      super.render();
    }

    return super.performStreamingUpdate();
  }

  /**
   * Specialized rendering logic for basic bubble charts
   * Uses building blocks for consistent, optimized rendering
   */
  protected performRender(): void {
    // Validate we have data
    if (!this.processedData.length) return;

    try {
      // Create bubble pack layout using rendering pipeline
      const layoutNodes = this.renderingPipeline.createBubblePackLayout(this.processedData);

      // Create bubble elements with consistent styling
      const bubbleElements = this.renderingPipeline.createBubbleElements(layoutNodes, this.processedData);

      // Attach event handling and interaction features
      this.interactionManager.attachBubbleEvents(bubbleElements.bubbleGroups, this.processedData);

      // Apply entrance animations
      if (this.config.animation) {
        this.renderingPipeline.applyEntranceAnimation(bubbleElements, {
          duration: this.config.animation.speed || 800,
          delay: 0
        });
      }
    } catch (error) {
      console.error('ReactiveBubbleBuilder: Error during rendering:', error);
    }
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  override getConfig(): BubbleChartConfig {
    return this.config;
  }

  /**
   * Update configuration with reactive propagation
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override setConfig(newConfig: Partial<BubbleChartConfig>): this {
    // Call reactive parent to handle config updates
    super.setConfig(newConfig);
    
    // Update building blocks with new config
    if (this.dataProcessor) {
      this.dataProcessor = new DataProcessor<T>(this.config);
      if (this.chartData.length) {
        this.processedData = this.dataProcessor.process(this.chartData);
      }
    }
    
    return this;
  }
} 