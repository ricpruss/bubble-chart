import * as d3 from 'd3';
import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';

/**
 * Interface describing the generated wave SVG path data
 */
interface WavePath {
  points: [number, number][];
  r: number;
}

/**
 * LiquidBubble – a static liquid-fill bubble chart.
 *
 * This implementation reuses the wave-generation logic from `WaveBubble`
 * but forces the wave amplitude to zero, producing a perfectly flat fill
 * level that represents the supplied percentage without animation.
 *
 * @template T – The data record type (must satisfy BubbleChartData)
 */
export class LiquidBubble<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  /** Wave configuration – amplitude forced to 0 for a flat surface */
  private readonly waveConfig = {
    frequency: 0.4,
    amplitude: 0 as const,   // <- no vertical displacement
    speed: 0.05,             // retained for API symmetry (unused)
    resolution: 5
  };

  /** Duration of the fill animation in milliseconds */
  private readonly animationDuration = 1500;

  constructor(config: BubbleChartOptions) {
    // Ensure the incoming config has the correct chart type
    const mutable = { ...config, type: 'liquid' as const };
    super(mutable);
  }

  /**
   * Render the liquid bubbles.
   */
  protected performRender(): void {
    if (!this.chartData || this.chartData.length === 0) {
      console.warn('LiquidBubble: No data to render');
      return;
    }

    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const { svg, dimensions } = svgElements;

    // Use ChartPipeline for data processing
    const processedData = ChartPipeline.processData(this.chartData, this.config);
    
    // Create bubble layout
    const layoutNodes = ChartPipeline.createBubbleLayout(
      processedData,
      dimensions.width,
      dimensions.height,
      5
    );

    // Create color scale with theme support
    const { colorScale, theme } = ChartPipeline.createColorScale(processedData, this.config);

    // Apply theme background
    ChartPipeline.applyTheme(svgElements, theme);

    // Create bubble groups using ChartPipeline
    const bubbleGroups = ChartPipeline.renderBubbleGroups(svg, layoutNodes, {
      cssClass: 'bubble-chart bubble',
      transform: true
    });

    // Create circles (background for liquid fill) with themed background
    bubbleGroups.selectAll('circle').remove(); // Clear existing to avoid duplicates
    bubbleGroups.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', theme?.liquidBackground || '#e6f3ff') // Use theme liquid background
      .attr('stroke', theme?.strokeColor || '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0.8);

    // Add labels using centralized rendering
    ChartPipeline.renderLabels(bubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      labelAccessor: (d: any) => d.data?.label || d.label || '',
      textColor: 'white',
      initialOpacity: 1 // Liquid bubbles render text immediately
    });

    // Add the flat liquid surface with theme
    this.createLiquidElements(bubbleGroups, layoutNodes, processedData, colorScale, theme);

    // Hook up mouse / touch interactions
    ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);
  }

  /**
   * Appends clip-paths and wave paths for each bubble group.
   */
  private createLiquidElements(bubbleGroups: any, layoutNodes: any[], processedData: any[], colorScale: any, theme: any): void {
    // Clear existing elements to avoid duplicates
    bubbleGroups.selectAll('defs').remove();
    bubbleGroups.selectAll('g[clip-path]').remove();
    
    // Clip path limiting the liquid fill to the circle outline
    bubbleGroups.append('defs')
      .append('clipPath')
      .attr('id', (_d: any, i: number) => `liquid-clip-${i}`)
      .append('circle')
      .attr('r', (_d: any, i: number) => layoutNodes[i].r);

    // Group containing the liquid path, constrained by the clip-path
    const waveGroups = bubbleGroups.append('g')
      .attr('clip-path', (_d: any, i: number) => `url(#liquid-clip-${i})`);

    // Flat wave path (it is still an SVG path for consistency)
    const paths = waveGroups.append('path')
      .attr('class', 'wave')
      .attr('fill', (_d: any, i: number) => {
        const item = processedData[i];
        return item?.colorValue ? colorScale(item.colorValue) : (this.config.defaultColor || '#2196F3');
      })
      .style('opacity', theme?.overlayOpacity || 0.8) // Use theme overlay opacity
      .attr('stroke', 'none')
      // Initial state: empty (0% filled)
      .each((_d: any, i: number, nodes: any[]) => {
        const path = d3.select<SVGPathElement, any>(nodes[i]);
        const waveData = this.generateWaveData(layoutNodes[i], 0);
        path.attr('d', d3.line()(waveData.points));
      });

    // Animate from 0 → target percentage
    paths.transition()
      .duration(this.animationDuration)
      .ease(d3.easeCubicOut)
      .attrTween('d', (_d: any, i: number, _nodes: any[]) => {
        const target = this.getPercentageValue(processedData[i].data);
        const interp = d3.interpolateNumber(0, target);
        const layoutNode = layoutNodes[i];
        const line = d3.line();
        return (t: number) => {
          const waveData = this.generateWaveData(layoutNode, interp(t));
          return line(waveData.points);
        };
      });
  }

  /**
   * Generates a flat wave path matching the requested percentage.
   */
  private generateWaveData(layoutNode: any, percentage: number): WavePath {
    const r = layoutNode.r;
    const baseY = (1 - percentage) * 2 * r - r;

    // Because amplitude is 0 the Y coordinate is constant
    const points: [number, number][] = d3
      .range(-r * 3, r * 3, this.waveConfig.resolution)
      .map(x => [x, baseY] as [number, number]);

    // Close the path so that the area beneath the line is filled
    points.push([r * 3, 2 * r], [-r * 3, 2 * r]);
    return { points, r };
  }

  /**
   * Extracts the fill-level percentage for a datum.
   */
  private getPercentageValue(data: T): number {
    if (this.config.percentage && typeof this.config.percentage === 'function') {
      return Math.max(0, Math.min(1, this.config.percentage(data)));
    }
    return 0.7; // sensible default
  }
} 