/**
 * Reactive Bubble Builder
 * BubbleBuilder with reactive data capabilities
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions } from '../types/config.js';
import { ReactiveChartBuilder } from './reactive-chart-builder.js';

import type { Observable } from './observable.js';

/**
 * Reactive version of BubbleBuilder
 */
export class ReactiveBubbleBuilder<T extends BubbleChartData = BubbleChartData> extends ReactiveChartBuilder<T> {

  /**
   * Creates a new ReactiveBubbleBuilder instance
   * @param config - Configuration object for the chart
   */
  constructor(config: BubbleChartOptions) {
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
        const animValues = {
      duration: this.config.animation?.enter?.duration || 800,
      staggerDelay: this.config.animation?.enter?.stagger || 0
    };
        this.renderingPipeline.applyEntranceAnimation(bubbleElements, {
          duration: animValues.duration,
          delay: 0,
          staggerDelay: animValues.staggerDelay
        });
      }
    } catch (error) {
      console.error('ReactiveBubbleBuilder: Error during rendering:', error);
    }
  }


} 