import * as d3 from 'd3';
import type { BubbleChartData } from './types/data.js';
import type { BubbleChartOptions } from './types/config.js';
import { BaseChartBuilder } from './core/index.js';
import { resolveColor } from './types/d3-helpers.js';

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
    if (!this.processedData.length) return;

    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    // Arrange bubbles using the standard pack layout
    const layoutNodes = this.renderingPipeline.createBubblePackLayout(this.processedData);
    const { bubbleGroups } = this.renderingPipeline.createBubbleElements(layoutNodes, this.processedData);

    // Add the flat liquid surface
    this.createLiquidElements(bubbleGroups, layoutNodes);

    // Hook up mouse / touch interactions
    this.interactionManager.attachBubbleEvents(bubbleGroups, this.processedData);
  }

  /**
   * Appends clip-paths and wave paths for each bubble group.
   */
  private createLiquidElements(bubbleGroups: any, layoutNodes: any[]): void {
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
      .attr('fill', (_d: any, i: number) => resolveColor(this.config.color, this.processedData[i]?.data, i, this.config.defaultColor || '#2196F3'))
      .style('opacity', 0.6)
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
        const target = this.getPercentageValue(this.processedData[i].data);
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