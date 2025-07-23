
import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';

/**
 * BubbleBuilder - Focused on d3.pack() static layouts
 * 
 * For continuous motion and dynamic updates, use MotionBubble instead.
 * MotionBubble leverages D3's elegant alpha system for sophisticated force animation.
 * 
 * @template T - The data type, must extend BubbleChartData
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
   * Render the bubble chart using d3.pack() layout
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

      console.log('📦 BubbleBuilder: Using d3.pack() static layout');

      // Create pack layout using shared pipeline
      const layoutNodes = ChartPipeline.createBubbleLayout(
        processedData,
        dimensions.width,
        dimensions.height,
        this.config.bubble?.padding || 5
      );
      
      const { colorScale, theme } = ChartPipeline.createColorScale(processedData, this.config);

      // Apply theme
      ChartPipeline.applyTheme(svgElements, theme);

      // Render bubbles using D3 join pattern
      const keyFunction = ChartPipeline.createKeyFunction(this.config);
      const bubbleGroups = svg.selectAll('g.bubble')
        .data(layoutNodes, keyFunction)
        .join(
          // ENTER: Create new bubbles
          (enter: any) => {
            const enterGroups = enter
              .append('g')
              .attr('class', 'bubble-chart bubble')
              .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

            // Add circles (start with radius 0 for entrance animation)
            enterGroups.append('circle')
              .attr('r', this.config.animation ? 0 : (d: any) => d.r)
              .style('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#ddd'))
              .style('stroke', '#fff')
              .style('stroke-width', 2)
              .style('opacity', this.config.animation ? 0 : 0.8);

                                     // Add labels using shared pipeline
            ChartPipeline.renderLabels(enterGroups, {
              radiusAccessor: (d: any) => d.r,
              labelAccessor: (d: any) => d.data?.label || '',
              textColor: 'white',
              formatFunction: this.config.format?.text,
              initialOpacity: this.config.animation ? 0 : 1
            });

            return enterGroups;
          },
          // UPDATE: Update existing bubbles  
          (update: any) => {
            update.transition()
              .duration(300)
              .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

            update.select('circle')
              .transition()
              .duration(300)
              .attr('r', (d: any) => d.r)
              .style('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#ddd'));

                         update.select('text')
               .transition()
               .duration(300)
               .text((d: any) => d.data?.label || '');

            return update;
          },
          // EXIT: Remove old bubbles
          (exit: any) => {
            exit.transition()
              .duration(300)
              .style('opacity', 0)
              .remove();
            return exit;
          }
        );

      // Attach events using shared pipeline
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);

      // Apply entrance animations
      ChartPipeline.applyEntranceAnimations(bubbleGroups, this.config);

      console.log('✅ BubbleBuilder: Pack layout rendered successfully');

    } catch (error) {
      console.error('BubbleBuilder render error:', error);
      throw error;
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
