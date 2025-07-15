import * as d3 from 'd3';
import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';

/**
 * Interface for wave animation data points
 */
interface WavePoint {
  points: [number, number][];
  r: number;
}

/**
 * WaveBubble - bubbles with filling wave animation.
 * Migrated to compositional architecture with significant code reduction.
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class WaveBubble<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  /**
   * D3.js timer for wave animation
   */
  private waveTimer?: d3.Timer;

  /**
   * Animation time counter
   */
  private animationTime = 0;

  /**
   * Wave animation configuration
   */
  private readonly waveConfig = {
    /** Wave frequency divider */
    frequency: 0.4,
    /** Wave amplitude as fraction of radius */
    amplitude: 0.05,
    /** Animation speed increment */
    speed: 0.05,
    /** Wave path resolution (distance between points) */
    resolution: 5
  };

  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'wave' as const };
    super(mutableConfig);
  }

  /**
   * Specialized rendering logic for wave bubbles with animated filling
   */
  protected performRender(): void {
    if (!this.chartData || this.chartData.length === 0) {
      return;
    }

    try {
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
        2
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

      // Create wave-specific background circles (not using standard pipeline circles)
      bubbleGroups.selectAll('circle').remove(); // Clear existing to avoid duplicates
      bubbleGroups.append('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', theme?.waveBackground || '#e0e7ff') // Use theme wave background
        .attr('stroke', theme?.strokeColor || '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      // Add labels using centralized rendering
      ChartPipeline.renderLabels(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        labelAccessor: (d: any) => d.data?.label || d.label || '',
        textColor: 'white',
        initialOpacity: 1 // Wave bubbles render text immediately
      });

      // Add wave-specific elements with theme
      this.createWaveElements(bubbleGroups, processedData, colorScale, theme);

      // Attach events and start animation
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);
      this.startWaveAnimation(bubbleGroups, processedData);

    } catch (error) {
      console.error('WaveBubble: Error during rendering:', error);
    }
  }

  /**
   * Creates wave-specific visual elements for each bubble
   */
  private createWaveElements(bubbleGroups: any, _processedData: any[], colorScale: any, theme: any): void {

    // Clear existing wave elements to avoid duplicates
    bubbleGroups.selectAll('defs').remove();
    bubbleGroups.selectAll('g[clip-path]').remove();

    // Create defs section for clip paths
    bubbleGroups.append('defs');

    // Create clip paths for each bubble
    bubbleGroups.each(function (this: SVGGElement, d: any, i: number) {
      const group = d3.select(this);
      const groupDefs = group.select('defs');
      
      groupDefs.append('clipPath')
        .attr('id', `wave-clip-${i}`)
        .append('circle')
        .attr('r', d.r);
    });

    // Append wave path to each bubble using the clip-path
    const waveGroups = bubbleGroups.append('g')
      .attr('clip-path', (_d: any, i: number) => `url(#wave-clip-${i})`);
      
    waveGroups.append('path')
      .attr('class', 'wave')
      .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#2196F3'))
      .style('opacity', theme?.overlayOpacity || 0.7) // Use theme overlay opacity
      .attr('stroke', 'none');
  }

  /**
   * Starts the wave animation using D3.js timer
   */
  private startWaveAnimation(bubbleGroups: any, processedData: any[]): void {
    this.stopWaveAnimation();
    this.animationTime = 0;

    // Capture class instance for reuse inside callbacks
    const self = this;

    // Initial draw so tests (and first frame) have wave paths before animation starts
    bubbleGroups.each(function (this: SVGGElement, d: any, bubbleIndex: number) {
      const group = d3.select<SVGGElement, any>(this);
      const path = group.select<SVGPathElement>('.wave');
      if (!path.empty()) {
        const waveData = self.generateWaveData(d, bubbleIndex, processedData);
        path.attr('d', waveData ? d3.line()(waveData.points) : null);
      }
    });

    // Start animated updates
    this.waveTimer = d3.timer(() => {
      this.animationTime += this.waveConfig.speed;
      
      bubbleGroups.each(function (this: SVGGElement, d: any, bubbleIndex: number) {
        const bubbleGroup = d3.select<SVGGElement, any>(this);
        const waveElement = bubbleGroup.select<SVGPathElement>('.wave');
        if (!waveElement.empty()) {
          const waveData = self.generateWaveData(d, bubbleIndex, processedData);
          waveElement.attr('d', waveData ? d3.line()(waveData.points) : null);
        }
      });
    });
  }

  /**
   * Generates wave path data for a single bubble
   */
  private generateWaveData(layoutNode: any, index: number, processedData: any[]): WavePoint {
    const r = layoutNode.r;
    const percentage = this.getPercentageValue(processedData[index].data);
    const baseY = (1 - percentage) * 2 * r - r;
    
    const points: [number, number][] = d3.range(-r * 3, r * 3, this.waveConfig.resolution)
      .map(x => {
        const waveY = baseY + Math.sin(x / (r * this.waveConfig.frequency) + this.animationTime) * r * this.waveConfig.amplitude;
        return [x, waveY] as [number, number];
      });
    
    points.push([r * 3, 2 * r], [-r * 3, 2 * r]);
    return { points, r };
  }

  /**
   * Gets the percentage value for wave fill level
   */
  private getPercentageValue(data: T): number {
    if (this.config.percentage && typeof this.config.percentage === 'function') {
      return Math.max(0, Math.min(1, this.config.percentage(data)));
    }
    
    return 0.7; // Default to 70%
  }

  /**
   * Stops the wave animation
   */
  private stopWaveAnimation(): void {
    if (this.waveTimer) {
      this.waveTimer.stop();
      this.waveTimer = undefined as any;
    }
  }

  /**
   * Updates wave configuration
   */
  updateWaveConfig(config: Partial<typeof this.waveConfig>): void {
    Object.assign(this.waveConfig, config);
  }

  /**
   * Gets current wave configuration
   */
  getWaveConfig(): typeof this.waveConfig {
    return { ...this.waveConfig };
  }


  /**
   * Clean up resources and stop animations
   */
  override destroy(): void {
    this.stopWaveAnimation();
    super.destroy();
  }
} 