import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';

/**
 * Basic bubble chart builder with TypeScript generics for data flexibility
 * Reduced to utilize centralized ChartPipeline for shared operations
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
   * Render the bubble chart using centralized ChartPipeline
   */
  protected performRender(): void {
    if (!this.chartData || this.chartData.length === 0) {
      console.warn('BubbleBuilder: No data to render');
      return;
    }

    try {
      // Process data and get SVG elements through shared pipeline
      const processedData = ChartPipeline.processData(this.chartData, this.config);
      const svgElements = this.svgManager.getElements();
      if (!svgElements) {
        console.error('BubbleBuilder: SVG elements not available');
        return;
      }
      const { svg, dimensions } = svgElements;

      // Create bubble layout
      const layoutNodes = ChartPipeline.createBubbleLayout(
        processedData,
        dimensions.width,
        dimensions.height,
        this.config.bubble?.padding || 5
      );

      // Render bubble groups
      const keyFunction = ChartPipeline.createKeyFunction(this.config);
      const bubbleGroups = ChartPipeline.renderBubbleGroups(svg, layoutNodes, 
        keyFunction ? { keyFunction } : {}
      );

      // Centralized color scale creation and theme application
      const { colorScale, theme } = ChartPipeline.createColorScale(processedData, this.config);
      ChartPipeline.applyTheme(svgElements.svg, theme);

      // Render circles and labels
      ChartPipeline.renderCircles(bubbleGroups, {
        colorAccessor: (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4')
      });
      ChartPipeline.renderLabels(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        labelAccessor: (d: any) => d.data?.label || d.label || '',
        textColor: this.getTextColor(),
        formatFunction: this.config.format?.text
      });

      // Attach events using interaction manager
      this.interactionManager.attachBubbleEvents(bubbleGroups, processedData);

      // Apply entrance animations
      ChartPipeline.applyEntranceAnimations(bubbleGroups, this.config);
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
    return this;
  }
}
