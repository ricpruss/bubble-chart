import * as d3 from 'd3';
import type { BubbleChartData } from './types/data.js';
import type { BubbleChartConfig } from './types/config.js';
import { BaseChartBuilder } from './core/index.js';
import { resolveColor } from './types/d3-helpers.js';

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
    amplitude: 0.2,
    /** Animation speed increment */
    speed: 0.05,
    /** Wave path resolution (distance between points) */
    resolution: 5
  };

  constructor(config: BubbleChartConfig) {
    super(config);
    this.config.type = 'wave';
  }

  /**
   * Specialized rendering logic for wave bubbles with animated filling
   */
  protected performRender(): void {
    if (!this.processedData.length) return;

    try {
      const svgElements = this.svgManager.getElements();
      if (!svgElements) return;
      
      const { svg: _svg } = svgElements;

      // Create bubble layout and elements using building blocks
      const layoutNodes = this.renderingPipeline.createBubblePackLayout(this.processedData);
      const bubbleElements = this.renderingPipeline.createBubbleElements(layoutNodes, this.processedData);

      // Add wave-specific elements
      this.createWaveElements(bubbleElements.bubbleGroups, layoutNodes);

      // Attach events and start animation
      this.interactionManager.attachBubbleEvents(bubbleElements.bubbleGroups, this.processedData);
      this.startWaveAnimation(bubbleElements.bubbleGroups);

    } catch (error) {
      console.error('WaveBubble: Error during rendering:', error);
    }
  }

  /**
   * Creates wave-specific visual elements for each bubble
   */
  private createWaveElements(bubbleGroups: any, layoutNodes: any[]): void {
    // Create clip paths and wave elements
    bubbleGroups.append('defs')
      .append('clipPath')
      .attr('id', (_d: any, i: number) => `wave-clip-${i}`)
      .append('circle')
              .attr('r', (_d: any, i: number) => layoutNodes[i].r);

    bubbleGroups.append('g')
      .attr('clip-path', (_d: any, i: number) => `url(#wave-clip-${i})`)
      .append('path')
      .attr('class', 'wave')
      .attr('fill', (_d: any, i: number) => resolveColor(this.config.color, this.processedData[i]?.data, i, this.config.defaultColor || '#2196F3'))
      .style('opacity', 0.6)
      .attr('stroke', 'none');
  }

  /**
   * Starts the wave animation using D3.js timer
   */
  private startWaveAnimation(bubbleGroups: any): void {
    this.stopWaveAnimation();
    this.animationTime = 0;

    this.waveTimer = d3.timer(() => {
      this.animationTime += this.waveConfig.speed;
      
      bubbleGroups.selectAll('.wave').attr('d', (d: any, i: number) => {
        const waveData = this.generateWaveData(d, i);
        return waveData ? d3.line()(waveData.points) : null;
      });
    });
  }

  /**
   * Generates wave path data for a single bubble
   */
  private generateWaveData(layoutNode: any, index: number): WavePoint {
    const r = layoutNode.r;
    const percentage = this.getPercentageValue(this.processedData[index].data);
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
   * Pauses the wave animation
   */
  pause(): void {
    this.stopWaveAnimation();
  }

  /**
   * Resumes the wave animation
   */
  resume(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;
    
    const bubbleGroups = svgElements.svg.selectAll('.bubble-group');
    this.startWaveAnimation(bubbleGroups);
  }

  /**
   * Clean up resources and stop animations
   */
  override destroy(): void {
    this.stopWaveAnimation();
    super.destroy();
  }
} 