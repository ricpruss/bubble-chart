import * as d3 from 'd3';
import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { D3DataUtils } from '../d3/index.js';

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

      const svgElements = this.svgManager.getElements();
      if (!svgElements) return;
      
      const { svg, dimensions } = svgElements;

      // Create bubble layout using D3DataUtils
      const layoutNodes = D3DataUtils.createPackLayout(
        processedData,
        dimensions.width,
        dimensions.height,
        2
      );

      // Create color scale for waves
      const colorValues = D3DataUtils.getUniqueValues(processedData, 'colorValue');
      const colorScale = colorValues.length > 0 ? 
        D3DataUtils.createColorScale(colorValues) : 
        () => this.config.defaultColor || '#2196F3';

      // Create bubble groups using D3's native .join() pattern
      const bubbleGroups = svg.selectAll('g.bubble')
        .data(layoutNodes)
        .join('g')
        .attr('class', 'bubble-chart bubble')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      // Create bubble circles
      bubbleGroups.selectAll('circle').remove(); // Clear existing to avoid duplicates
      bubbleGroups.append('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#ddd'))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      // Add labels
      bubbleGroups.selectAll('text').remove(); // Clear existing to avoid duplicates
      bubbleGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('fill', '#333')
        .style('font-size', (d: any) => Math.max(10, d.r / 3))
        .style('pointer-events', 'none')
        .text((d: any) => D3DataUtils.formatLabel(d.data.label, 15));

      // Add wave-specific elements
      this.createWaveElements(bubbleGroups, processedData);

      // Attach events and start animation
      this.interactionManager.attachBubbleEvents(bubbleGroups, processedData);
      this.startWaveAnimation(bubbleGroups, processedData);

    } catch (error) {
      console.error('WaveBubble: Error during rendering:', error);
    }
  }

  /**
   * Creates wave-specific visual elements for each bubble
   */
  private createWaveElements(bubbleGroups: any, processedData: any[]): void {
    // Create color scale for waves
    const colorValues = D3DataUtils.getUniqueValues(processedData, 'colorValue');
    const colorScale = colorValues.length > 0 ? 
      D3DataUtils.createColorScale(colorValues) : 
      () => this.config.defaultColor || '#2196F3';

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
      .style('opacity', 0.6)
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