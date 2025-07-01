import * as d3 from 'd3';
import { BaseChartBuilder } from './core/index.js';
import type { BubbleChartData } from './types/data.js';
import type { BubbleChartConfig } from './types/config.js';

/**
 * LiquidBubble – a gauge-style bubble chart where the fill level
 * represents a percentage (0–1). The fill animates from 0 to the
 * supplied percentage when rendered.
 * 
 * Ideal for displaying completion rates, progress indicators, or any
 * percentage-based metrics with visual appeal.
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class LiquidBubble<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  /**
   * Default animation configuration for liquid fill
   */
  private readonly defaultAnimationDuration = 1000;

  /**
   * Creates a new LiquidBubble instance
   * @param config - Chart configuration with optional animation settings
   */
  constructor(config: BubbleChartConfig) {
    super(config);
    this.config.type = 'liquid';
    
    // Set up bubble animation configuration with defaults
    if (!this.config.bubble) {
      this.config.bubble = {
        minRadius: 10,
        animation: this.defaultAnimationDuration,
        padding: 10,
        allText: 'All'
      };
    } else {
      this.config.bubble.animation = this.config.bubble.animation || this.defaultAnimationDuration;
    }
  }

  /**
   * Renders the liquid bubble chart with animated fill using building blocks
   */
  protected performRender(): void {
    try {
      if (!this.processedData || this.processedData.length === 0) {
        console.warn('LiquidBubble: No data to render');
        return;
      }

      // Use building blocks for standard bubble pack layout
      const layoutNodes = this.renderingPipeline.createBubblePackLayout(this.processedData);
      const bubbleElements = this.renderingPipeline.createBubbleElements(layoutNodes, this.processedData);

      // Add liquid fill effects to the bubbles
      this.createLiquidEffects(bubbleElements.bubbleGroups, layoutNodes);

      // Use InteractionManager for event handling
      this.interactionManager.attachBubbleEvents(bubbleElements.bubbleGroups, this.processedData);

    } catch (error) {
      console.error('LiquidBubble render error:', error);
      throw error;
    }
  }

  /**
   * Creates liquid fill effects with clip paths and animated rectangles
   * @param bubbleGroups - D3 selection of bubble groups
   * @param layoutNodes - Layout data with position and radius information
   */
  private createLiquidEffects(bubbleGroups: any, layoutNodes: any[]): void {
    try {
      // Add unique clipPath for each bubble to contain the liquid fill
      bubbleGroups.append('clipPath')
        .attr('id', (_d: any, i: number) => `liquid-clip-${i}`)
        .append('circle')
        .attr('r', (_d: any, i: number) => layoutNodes[i].r);

      // Create group for liquid fill elements with clipping applied
      const fillGroup = bubbleGroups.append('g')
        .attr('transform', (_d: any, i: number) => `translate(${layoutNodes[i].x}, ${layoutNodes[i].y})`)
        .attr('clip-path', (_d: any, i: number) => `url(#liquid-clip-${i})`);

      // Create the liquid fill rectangles
      const rects = fillGroup.append('rect')
        .attr('x', (_d: any, i: number) => -layoutNodes[i].r)
        .attr('width', (_d: any, i: number) => layoutNodes[i].r * 2)
        .attr('y', (_d: any, i: number) => layoutNodes[i].r)   // Start empty (positioned at bottom)
        .attr('height', 0)            // Zero height initially
        .attr('fill', (_d: T, i: number) => {
          return this.config.color ? this.config.color(i.toString()) : this.config.defaultColor || '#4CAF50';
        })
        .attr('opacity', 0.7)
        .attr('stroke', 'none');

      // Animate to target height based on percentage
      const animationDuration = this.config.bubble?.animation || this.defaultAnimationDuration;

      rects.transition()
        .duration(animationDuration)
        .ease(d3.easeCircleOut)
        .attr('y', (d: T, i: number) => {
          const percentage = this.getPercentageValue(d);
          return -layoutNodes[i].r + (1 - percentage) * layoutNodes[i].r * 2;
        })
        .attr('height', (d: T, i: number) => {
          const percentage = this.getPercentageValue(d);
          return layoutNodes[i].r * 2 * percentage;
        });

    } catch (error) {
      console.error('LiquidBubble liquid effects error:', error);
      throw error;
    }
  }

  /**
   * Gets the percentage value for liquid fill level
   * @param data - The data item
   * @returns Percentage value between 0 and 1
   */
  private getPercentageValue(data: T): number {
    if (this.config.percentage) {
      if (typeof this.config.percentage === 'function') {
        const result = this.config.percentage(data);
        return Math.max(0, Math.min(1, result)); // Clamp between 0 and 1
      }
    }
    
    // Default to full (100%) if no percentage function is provided
    return 1;
  }

  /**
   * Updates the liquid fill levels with new data
   * @param newData - New data to display
   */
  updateData(newData: T[]): void {
    this.chartData = newData;
    
    const svgElements = this.svgManager.getElements();
    if (!svgElements) {
      this.render();
      return;
    }

    const bubbles = svgElements.svg.selectAll('.bubble');
    const rects = bubbles.selectAll('rect');

    // Animate to new percentage values
    const animationDuration = this.config.bubble?.animation || this.defaultAnimationDuration;

    rects.transition()
      .duration(animationDuration)
      .ease(d3.easeCircleOut)
      .attr('y', (d: any) => {
        const percentage = this.getPercentageValue(d.data);
        return -d.r + (1 - percentage) * d.r * 2;
      })
      .attr('height', (d: any) => {
        const percentage = this.getPercentageValue(d.data);
        return d.r * 2 * percentage;
      });
  }

  /**
   * Get current animation duration setting
   * @returns Animation duration in milliseconds
   */
  getAnimationDuration(): number {
    return this.config.bubble?.animation || this.defaultAnimationDuration;
  }

  /**
   * Set animation duration for liquid fill
   * @param duration - Duration in milliseconds
   */
  setAnimationDuration(duration: number): void {
    if (!this.config.bubble) {
      this.config.bubble = {
        minRadius: 10,
        animation: duration,
        padding: 10,
        allText: 'All'
      };
    } else {
      this.config.bubble.animation = duration;
    }
  }
} 