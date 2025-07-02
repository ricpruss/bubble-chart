import type { BubbleChartConfig } from './types/config.js';
import type { BubbleChartData } from './types/data.js';
import { BaseChartBuilder, DataProcessor } from './core/index.js';

/**
 * Basic bubble chart builder with TypeScript generics for data flexibility
 * Migrated to use compositional architecture with building blocks
 */
export class BubbleBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {

  /**
   * Creates a new BubbleBuilder instance
   * @param config - Configuration object for the chart
   */
  constructor(config: BubbleChartConfig) {
    super(config);
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
          delay: 0,
          staggerDelay: this.config.animation.staggerDelay || 0
        });
      }
    } catch (error) {
      console.error('BubbleBuilder: Error during rendering:', error);
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
   * Update configuration
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override setConfig(newConfig: Partial<BubbleChartConfig>): this {
    this.config = { ...this.config, ...newConfig };
    
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