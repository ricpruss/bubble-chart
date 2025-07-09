import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { D3DataUtils } from '../d3/index.js';
import * as d3 from 'd3';

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
      // Process data with color accessor using D3DataUtils
      const colorConfig = this.config.color;
      const colorAccessor = (typeof colorConfig === 'string' || typeof colorConfig === 'function') 
        ? colorConfig as (string | ((d: BubbleChartData) => string))
        : undefined;
      
      const processedData = D3DataUtils.processForVisualization(
        this.chartData,
        this.config.label || 'label',
        this.config.size || 'size',
        colorAccessor
      );

      // Get SVG elements from building blocks
      const svgElements = this.svgManager.getElements();
      if (!svgElements) {
        console.error('BubbleBuilder: SVG elements not available');
        return;
      }

      const { svg, dimensions } = svgElements;

      // Create layout nodes using D3DataUtils
      const layoutNodes = D3DataUtils.createPackLayout(
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

      // Create color scale using D3DataUtils
      const colorValues = D3DataUtils.getUniqueValues(processedData, 'colorValue');
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

      // Handle labels with proper enter/update/exit
      bubbleGroups.selectAll('text')
        .data((d: any) => [d]) // One label per bubble group
        .join(
          (enter: any) => enter.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', (d: any) => fontScale(d.r))
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text((d: any) => {
              const label = d.data.label;
              return this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
            }),
          (update: any) => update
            .transition()
            .duration(this.config.animation?.update?.duration || 800)
            .style('font-size', (d: any) => fontScale(d.r))
            .style('opacity', 1)
            .text((d: any) => {
              const label = d.data.label;
              return this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
            }),
          (exit: any) => exit
            .transition()
            .duration(this.config.animation?.exit?.duration || 400)
            .style('opacity', 0)
            .remove()
        );

      // Attach event handling
      this.interactionManager.attachBubbleEvents(bubbleGroups, processedData);

      // Apply entrance animations to newly entered elements
      if (this.config.animation) {
        const duration = this.config.animation?.enter?.duration || 800;
        const staggerDelay = this.config.animation?.enter?.stagger || 0;
        
        // Animate all circles (they start with r=0 and opacity=0)
        bubbleGroups.selectAll('circle')
          .transition()
          .delay((_d: any, i: number) => i * staggerDelay)
          .duration(duration)
          .attr('r', (d: any) => d.r)
          .style('opacity', 0.8);

        // Animate all labels (they start with opacity=0)
        bubbleGroups.selectAll('text')
          .transition()
          .delay((_d: any, i: number) => i * staggerDelay + (staggerDelay > 0 ? 200 : 0))
          .duration(duration / 2)
          .style('opacity', 1);
      } else {
        // No animations - set final values immediately
        
        bubbleGroups.selectAll('circle')
          .attr('r', (d: any) => d.r)
          .style('opacity', 0.8);
        
        bubbleGroups.selectAll('text')
          .style('opacity', 1);
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
    return this;
  }
} 