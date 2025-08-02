import type { BubbleChartData, BubbleChartOptions, ChartHandle } from '../types.js';
import { BaseChartBuilder } from '../core/base.js';
import { formatNumber } from '../core/utils.js';
import { ChartPipeline } from '../core/pipeline.js';
import * as d3 from 'd3';

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
      const sortedData = ChartPipeline.processData(this.chartData, this.config).sort((a, b) => b.size - a.size);

      // Configuration with defaults
      const maxRadius = this.config.listBubble?.maxRadius || 25;
      const minRadius = this.config.listBubble?.minRadius || 5;
      const padding = this.config.listBubble?.padding || 10;
      const textWidth = this.config.listBubble?.textWidth || 200;

      // Create radius scale using ChartPipeline
      this.radiusScale = ChartPipeline.createRadiusScale(sortedData, [minRadius, maxRadius]);

      // Calculate layout and update SVG dimensions properly
      const lineHeight = maxRadius * 2 + padding;
      const newHeight = lineHeight * sortedData.length;
      this.svgManager.updateDimensions(
        this.svgManager.getElements()?.dimensions.width || 500,
        newHeight
      );

      // Create color scale using ChartPipeline
      const { colorScale, theme } = ChartPipeline.createColorScale(sortedData, this.config);
      ChartPipeline.applyTheme(svgElements, theme);
      
      // Get theme text color
      const themeTextColor = theme?.textColor || '#ffffff';
      
      // Clear existing list rows first
      svg.selectAll('g.list-row').remove();
      
      // Create row groups using centralized rendering
      const rows = ChartPipeline.renderBubbleGroups(svg, sortedData, {
        keyFunction: (d: any) => d.label,
        cssClass: 'list-row',
        transform: false,
      });

      // Update transform and cursor
      rows.attr('transform', (_d: any, i: number) => `translate(0, ${i * lineHeight + maxRadius})`)
          .style('cursor', 'pointer');

      // Add circles using centralized rendering
      const circles = ChartPipeline.renderCircles(rows, {
        radiusAccessor: (d: any) => this.radiusScale!(d.size || 0),
        colorAccessor: (d: any) => {
          if (d.colorValue) {
            return colorScale(d.colorValue);
          }
          // For list view, cycle through theme colors starting from index 1 (skip background color)
          const themeColors = theme?.colors || ['#334155', '#64748b', '#94a3b8', '#cbd5e1'];
          const colorIndex = sortedData.indexOf(d) % (themeColors.length - 1);
          return themeColors[colorIndex + 1] || themeColors[1];
        },
        strokeColor: '#fff',
        strokeWidth: 2,
        opacity: 0.8,
        initialRadius: this.config.animation ? 0 : (d: any) => this.radiusScale!(d.size || 0), // Start with 0 for animation
        initialOpacity: this.config.animation ? 0 : 0.8 // Start with 0 for animation
      });

      // Add labels using centralized rendering
      const labels = ChartPipeline.renderLabels(rows, {
        radiusAccessor: (d: any) => this.radiusScale!(d.size || 0),
        labelAccessor: (d: any) => this.config.format?.text ? this.config.format.text(d.label) : d.label,
        textColor: themeTextColor,
        maxLength: 30,
        initialOpacity: this.config.animation ? 0 : 1 // Start with 0 for animation
      });
      
      // Position labels for list layout
      labels.attr('x', maxRadius * 2 + padding)
            .attr('y', 0)
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-family', 'sans-serif')
            .style('text-anchor', 'start');
      // Add optional size values using D3DataUtils formatting
      if (this.config.format?.number) {
        rows.append('text')
          .attr('x', maxRadius * 2 + padding)
          .attr('y', 0)
          .attr('dy', '1.5em')
          .style('font-size', '12px')
          .style('font-family', 'sans-serif')
          .style('fill', themeTextColor)
          .style('opacity', 0.7)
          .style('pointer-events', 'none')
          .text((d: any) => this.config.format!.number!(d.size || 0));
      } else {
        // Default number formatting using formatNumber utility
        rows.append('text')
          .attr('x', maxRadius * 2 + padding)
          .attr('y', 0)
          .attr('dy', '1.5em')
          .style('font-size', '12px')
          .style('font-family', 'sans-serif')
          .style('fill', themeTextColor)
          .style('opacity', 0.7)
          .style('pointer-events', 'none')
          .text((d: any) => formatNumber(d.size || 0));
      }

      // Apply text wrapping for long labels
      ChartPipeline.wrapText(labels, textWidth);
      
      // Position circles for list layout
      circles.attr('cx', maxRadius).attr('cy', 0);
      
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

    // Animate both radius and opacity for circles
    circles.attr('r', 0)
        .style('opacity', 0)
        .transition()
        .delay((_d: any, i: number) => i * 100 + 200)
        .duration(duration / 2)
        .attr('r', (d: any) => this.radiusScale!(d.size || 0))
        .style('opacity', 0.8);
        
    labels.style('opacity', 0).transition().delay((_d: any, i: number) => i * 100 + 400).duration(duration / 3).style('opacity', 1);
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
    
    // Re-process data with new config if needed
    if (this.chartData.length) {
      this.processedData = ChartPipeline.processData(this.chartData, this.config);
    }
    
    return this;
  }

  /**
   * Update data and re-render
   */
  updateData(newData: T[]): void {
    this.data(newData).update();
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
    if (this.chartData.length > 0) this.update();
  }
} 