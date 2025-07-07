/**
 * Reactive Bubble Builder
 * BubbleBuilder with reactive data capabilities
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions } from '../types/config.js';
import { ReactiveChartBuilder } from './reactive-chart-builder.js';
import { D3DataUtils } from '../utils/d3-data-utils.js';
import * as d3 from 'd3';

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
   * Specialized rendering logic for reactive bubble charts
   * Uses D3-native patterns consistent with base bubble charts
   */
  protected performRender(): void {
    // Validate we have data
    if (!this.processedData.length) return;

    try {
      // Use the same D3-native rendering approach as BubbleBuilder
      // but adapted for reactive context
      this.renderBubblesWithD3Patterns();
    } catch (error) {
      console.error('ReactiveBubbleBuilder: Error during rendering:', error);
    }
  }

  /**
   * Render bubbles using D3-native patterns (similar to BubbleBuilder)
   */
  private renderBubblesWithD3Patterns(): void {
    // This follows the same pattern as BubbleBuilder.performRender()
    // but uses this.processedData instead of processing raw chartData
    
    const svgElements = this.svgManager.getElements();
    if (!svgElements) {
      console.error('ReactiveBubbleBuilder: SVG elements not available');
      return;
    }

    const { svg, dimensions } = svgElements;

    // Create layout nodes using D3DataUtils
    const layoutNodes = D3DataUtils.createPackLayout(
      this.processedData as any,
      dimensions.width,
      dimensions.height,
      this.config.bubble?.padding || 5
    );

    // Create bubble groups using D3's native data binding
    const bubbleGroups = svg.selectAll('.bubble')
      .data(layoutNodes)
      .join('g')
      .attr('class', 'bubble-chart bubble')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer');

    // Create color scale using D3DataUtils
    const colorValues = D3DataUtils.getUniqueValues(this.processedData as any, 'colorValue');
    const colorScale = colorValues.length > 0 ? 
      d3.scaleOrdinal()
        .domain(colorValues)
        .range([
          '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
          '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#1f77b4'
        ]) :
      () => this.config.defaultColor || '#1f77b4';

    // Create font scale
    const radiusExtent = d3.extent(layoutNodes, (d: any) => d.r) as [number, number];
    const fontScale = D3DataUtils.createFontScale(radiusExtent, [10, 18]);

    // Create circles
    bubbleGroups.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);

    // Create labels
    bubbleGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', (d: any) => fontScale(d.r))
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const label = d.data.label;
        return this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
      });

    // Attach event handling
    this.interactionManager.attachBubbleEvents(bubbleGroups, this.processedData);

    // Apply entrance animations using D3 transitions
    if (this.config.animation) {
      const duration = this.config.animation?.enter?.duration || 800;
      const staggerDelay = this.config.animation?.enter?.stagger || 0;
      
      // Animate circles
      bubbleGroups.select('circle')
        .attr('r', 0)
        .style('opacity', 0)
        .transition()
        .delay((_d: any, i: number) => i * staggerDelay)
        .duration(duration)
        .attr('r', (d: any) => d.r)
        .style('opacity', 0.8);

      // Animate labels
      bubbleGroups.select('text')
        .style('opacity', 0)
        .transition()
        .delay((_d: any, i: number) => i * staggerDelay + (staggerDelay > 0 ? 200 : 0))
        .duration(duration / 2)
        .style('opacity', 1);
    }
  }


} 