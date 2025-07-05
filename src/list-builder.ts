import type { BubbleChartData } from './types/data.js';
import type { BubbleChartOptions, ChartHandle } from './types/config.js';
import { BaseChartBuilder } from './core/index.js';
import * as d3 from 'd3';
import { resolveColor } from './types/d3-helpers.js';

/**
 * ListBuilder – displays bubbles in a vertical list layout with labels.
 * Migrated to use compositional architecture with significant code reduction.
 * Implements ChartHandle interface for unified API
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class ListBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> implements ChartHandle<T> {
  private radiusScale?: d3.ScalePower<number, number>;

  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'list' as const };
    super(mutableConfig);
  }

  /**
   * Specialized rendering logic for list bubble charts
   */
  protected performRender(): void {
    if (!this.processedData.length) return;

    try {
      const svgElements = this.svgManager.getElements();
      if (!svgElements) return;
      
      const { svg } = svgElements;

      // Sort processed data by size (descending)
      const sortedData = [...this.processedData].sort((a, b) => (b.size || 0) - (a.size || 0));

      // Configuration with defaults
      const maxRadius = this.config.listBubble?.maxRadius || 25;
      const minRadius = this.config.listBubble?.minRadius || 5;
      const padding = this.config.listBubble?.padding || 10;
      const textWidth = this.config.listBubble?.textWidth || 200;

      // Create radius scale
      const sizeExtent = d3.extent(sortedData, d => d.size || 0) as [number, number];
      this.radiusScale = d3.scaleSqrt<number, number>()
        .domain([0, sizeExtent[1] || 1])
        .range([minRadius, maxRadius])
        .clamp(true);

      // Calculate layout and update SVG dimensions properly
      const lineHeight = maxRadius * 2 + padding;
      const newHeight = lineHeight * sortedData.length;
      
      // Use SVGManager to update both height and viewBox
      this.svgManager.updateDimensions(
        this.svgManager.getElements()?.dimensions.width || 500,
        newHeight
      );

      // Clear existing list rows first
      svg.selectAll('g.list-row').remove();
      
      // Create row groups using modern D3 join pattern
      const rows = svg.selectAll('g.list-row')
        .data(sortedData)
        .join('g')
        .attr('class', 'list-row')
        .attr('transform', (_d: any, i: number) => `translate(0, ${i * lineHeight + maxRadius})`)
        .style('cursor', 'pointer');

      // Add circles
      const circles = rows.append('circle')
        .attr('cx', maxRadius)
        .attr('cy', 0)
        .attr('r', (d: any) => this.radiusScale!(d.size || 0))
        .attr('fill', (d: any, i: number) => resolveColor(this.config.color, d, i, this.config.defaultColor || '#2196F3'))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('opacity', 0.8);

      // Add labels
      const labels = rows.append('text')
        .attr('x', maxRadius * 2 + padding)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '14px')
        .style('font-family', 'sans-serif')
        .style('fill', '#333')
        .style('pointer-events', 'none')
        .text((d: any) => this.config.format?.text ? this.config.format.text(d.label) : d.label)
        .call(this.wrapText.bind(this), textWidth);

      // Add optional size values
      if (this.config.format?.number) {
        rows.append('text')
          .attr('x', maxRadius * 2 + padding)
          .attr('y', 0)
          .attr('dy', '1.5em')
          .style('font-size', '12px')
          .style('font-family', 'sans-serif')
          .style('fill', '#666')
          .style('opacity', 0.7)
          .style('pointer-events', 'none')
          .text((d: any) => this.config.format!.number!(d.size || 0));
      }

      // Use interaction manager for events
      this.interactionManager.attachBubbleEvents(rows, this.processedData);

      // Apply animations if configured
      if (this.config.animation) {
        const animValues = {
      duration: this.config.animation?.enter?.duration || 800,
      staggerDelay: this.config.animation?.enter?.stagger || 0
    };
        this.animateList(rows, circles, labels, animValues.duration);
      }

    } catch (error) {
      console.error('ListBuilder: Error during rendering:', error);
    }
  }

  /**
   * Simple list animations
   */
  private animateList(rows: any, circles: any, labels: any, duration: number): void {
    const maxRadius = this.config.listBubble?.maxRadius || 25;
    const padding = this.config.listBubble?.padding || 10;
    const lineHeight = maxRadius * 2 + padding;
    
    rows.attr('transform', (_d: any, i: number) => `translate(-50, ${i * lineHeight + maxRadius})`)
        .style('opacity', 0)
        .transition()
        .delay((_d: any, i: number) => i * 100)
        .duration(duration)
        .attr('transform', (_d: any, i: number) => `translate(0, ${i * lineHeight + maxRadius})`)
        .style('opacity', 1);

    circles.attr('r', 0).transition().delay((_d: any, i: number) => i * 100 + 200).duration(duration / 2).attr('r', (d: any) => this.radiusScale!(d.size || 0));
    labels.style('opacity', 0).transition().delay((_d: any, i: number) => i * 100 + 400).duration(duration / 3).style('opacity', 1);
  }

  /**
   * Text wrapping utility for long labels
   */
  private wrapText(text: any, width: number): void {
    text.each(function(this: SVGTextElement) {
      const textElement = d3.select(this);
      const words = textElement.text().split(/\s+/).reverse();
      const lineHeight = 1.1;
      const y = textElement.attr('y');
      const dy = parseFloat(textElement.attr('dy'));
      
      let line: string[] = [];
      let lineNumber = 0;
      let word: string | undefined;
      let tspan = textElement.text(null).append('tspan')
        .attr('x', textElement.attr('x'))
        .attr('y', y)
        .attr('dy', dy + 'em');

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(' '));
        
        if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = textElement.append('tspan')
            .attr('x', textElement.attr('x'))
            .attr('y', y)
            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
            .text(word);
        }
      }
    });
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
    
    // Update building blocks with new config if needed
    if (this.dataProcessor && this.chartData.length) {
      this.processedData = this.dataProcessor.process(this.chartData);
    }
    
    return this;
  }

  /**
   * Update data and re-render
   */
  updateData(newData: T[]): void {
    this.data(newData).render();
  }

  /**
   * Get current radius scale
   */
  getRadiusScale(): d3.ScalePower<number, number> | undefined {
    return this.radiusScale;
  }

  /**
   * Update list-specific configuration
   */
  updateListConfig(config: Partial<NonNullable<BubbleChartOptions['listBubble']>>): void {
    if (!this.config.listBubble) {
      this.config.listBubble = { minRadius: 5, maxRadius: 25, padding: 10, textWidth: 200 };
    }
    Object.assign(this.config.listBubble, config);
    if (this.chartData.length > 0) this.render();
  }
} 