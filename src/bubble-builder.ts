import type { BubbleChartOptions, ChartHandle } from './types/config.js';
import type { BubbleChartData } from './types/data.js';
import { BaseChartBuilder, DataProcessor } from './core/index.js';

/**
 * Basic bubble chart builder with TypeScript generics for data flexibility
 * Migrated to use compositional architecture with building blocks
 * Implements ChartHandle interface for unified API
 */
export class BubbleBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> implements ChartHandle<T> {

  /**
   * Creates a new BubbleBuilder instance
   * @param config - Configuration object for the chart
   */
  constructor(config: BubbleChartOptions) {
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
      console.error('BubbleBuilder: Error during rendering:', error);
    }
  }

  /**
   * Get readonly merged options (unified API)
   * @returns Readonly configuration options
   */
  override options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze(this.config as unknown as BubbleChartOptions<T>);
  }

  /**
   * Merge-update options (unified API)
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
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