import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';

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
   * Uses D3-native patterns for simplicity and performance
   */
  protected performRender(): void {
    if (!this.chartData || this.chartData.length === 0) {
      console.warn('BubbleBuilder: No data to render');
      return;
    }

    try {
      // Use shared pipeline for data processing
      const processedData = ChartPipeline.processData(this.chartData, this.config);

      // Get SVG elements from building blocks
      const svgElements = this.svgManager.getElements();
      if (!svgElements) {
        console.error('BubbleBuilder: SVG elements not available');
        return;
      }

      const { svg, dimensions } = svgElements;

      // Use shared pipeline for layout creation
      const layoutNodes = ChartPipeline.createBubbleLayout(
        processedData,
        dimensions.width,
        dimensions.height,
        this.config.bubble?.padding || 5
      );

      // Create key function for D3 data joins - enables proper enter/update/exit lifecycle
      const keyFunction = this.config.keyFunction 
        ? (d: any) => {
            // The data structure is nested: d.data.data contains the original data
            const originalData = d.data.data || d.data;
            return this.config.keyFunction!(originalData);
          }
        : undefined;

      // Create bubble groups using D3's native data binding with key function
      const bubbleGroups = svg.selectAll('.bubble')
        .data(layoutNodes, keyFunction)
        .join(
          // ENTER: New bubbles
          (enter: any) => {
            return enter.append('g')
              .attr('class', 'bubble-chart bubble')
              .style('cursor', 'pointer')
              .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
          },
          // UPDATE: Existing bubbles
          (update: any) => {
            return update
              .transition()
              .duration(this.config.animation?.update?.duration || 800)
              .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
          },
          // EXIT: Bubbles to remove
          (exit: any) => {
            return exit
              .transition()
              .duration(this.config.animation?.exit?.duration || 400)
              .style('opacity', 0)
              .remove();
          }
        );

      // Use shared pipeline for color scale creation
      const { colorScale, theme } = ChartPipeline.createColorScale(processedData, this.config);

      // Apply theme background color if available
      if (theme?.background) {
        svgElements.svg.style('background', theme.background);
      }

      // Use shared pipeline for font scale creation

      // Handle circles with proper enter/update/exit
      bubbleGroups.selectAll('circle')
        .data((d: any) => [d]) // One circle per bubble group
        .join(
          (enter: any) => {
            return enter.append('circle')
              .attr('r', 0)
              .style('opacity', 0)
              .attr('fill', (d: any) => {
                const color = d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4');
                return color;
              })
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);
          },
          (update: any) => update
            .transition()
            .duration(this.config.animation?.update?.duration || 800)
            .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
            .attr('r', (d: any) => d.r)
            .style('opacity', 0.8),
          (exit: any) => exit
            .transition()
            .duration(this.config.animation?.exit?.duration || 400)
            .attr('r', 0)
            .style('opacity', 0)
            .remove()
        );

      // Handle labels using centralized text rendering
      ChartPipeline.renderLabels(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        labelAccessor: (d: any) => d.data?.label || d.label || '',
        textColor: this.getTextColor(),
        formatFunction: this.config.format?.text ? this.config.format.text : undefined
      });

      // Attach event handling
      this.interactionManager.attachBubbleEvents(bubbleGroups, processedData);

      // Use shared pipeline for entrance animations
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