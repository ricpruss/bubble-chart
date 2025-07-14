import * as d3 from 'd3';
import { BaseChartBuilder } from '../core/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
import { D3DataUtils } from '../d3/index.js';
import { ChartPipeline } from './shared/index.js';

/**
 * Motion configuration for force simulation
 */
interface MotionConfig {
  /** Collision separation strength (0-1) */
  repulseStrength?: number;
  /** Velocity decay (lower = more motion) */
  decay?: number;
  /** Extra radius for collision padding */
  collidePadding?: number;
  /** How strongly bubbles are attracted to center */
  centerStrength?: number;
  /** Minimum alpha before simulation stops */
  alphaMin?: number;
  /** Steady-state energy level (0-1) */
  alphaTarget?: number;
}

/**
 * MotionBubble – animated, continuously moving bubbles using d3-force.
 * Migrated to compositional architecture with preserved force simulation.
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class MotionBubble<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  private motionConfig: Required<MotionConfig>;
  private simulation: d3.Simulation<any, undefined> | null = null;

  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'motion' as const };
    super(mutableConfig);
    
    // Merge animation defaults with user config
    this.motionConfig = {
      repulseStrength: 0.7,
      decay: 0.05,
      collidePadding: 2,
      centerStrength: 0.05,
      alphaMin: 0.00001,
      alphaTarget: 0.02,
      ...(this.config.animation as MotionConfig || {})
    };
  }

  /**
   * Renders motion bubbles with force simulation using building blocks
   */
  protected performRender(): void {
    try {
      if (!this.chartData || this.chartData.length === 0) {
        console.warn('MotionBubble: No data to render');
        return;
      }

      // Process data using the shared ChartPipeline
      this.processedData = ChartPipeline.processData(
        this.chartData,
        this.config
      );
      

      // Stop any existing simulation
      this.stopSimulation();

      // Get SVG elements from building blocks
      const svgElements = this.svgManager.getElements();
      if (!svgElements) {
        console.error('MotionBubble: SVG elements not available');
        return;
      }

      const { svg, dimensions } = svgElements;

      // Create scales using the shared ChartPipeline
      const radiusScale = D3DataUtils.createRadiusScale(
        this.processedData,
        (d) => d.size,
        [8, Math.min(dimensions.width, dimensions.height) / 12]
      );
      
      const { colorScale, theme } = ChartPipeline.createColorScale(
        this.processedData,
        this.config
      );

      // Apply theme background color if available
      if (theme?.background) {
        svgElements.svg.style('background', theme.background);
      }
      
      // Create motion nodes with random initial positions
      const motionNodes = this.processedData.map((d) => ({
        data: d,
        r: radiusScale(d.size),
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height
      }));
      

      // Create bubble groups and elements
      const bubbleGroups = svg.selectAll('g.bubble')
        .data(motionNodes)
        .enter()
        .append('g')
        .attr('class', 'bubble-chart bubble');

      // Create circles with motion-specific styling
      bubbleGroups.append('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer');

      // Add text labels using centralized rendering
      ChartPipeline.renderLabels(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        labelAccessor: (d: any) => d.data?.label || d.label || '',
        textColor: this.getTextColor(),
        formatFunction: this.config.format?.text ? this.config.format.text : undefined,
        initialOpacity: 1 // Motion bubbles don't use entrance animations
      });

      // Use InteractionManager for event handling
      this.interactionManager.attachBubbleEvents(bubbleGroups, this.processedData);

      // Start force simulation for continuous motion
      this.startForceSimulation(motionNodes, bubbleGroups, dimensions);

    } catch (error) {
      console.error('MotionBubble render error:', error);
      throw error;
    }
  }

  /**
   * Starts the D3.js force simulation for continuous motion
   * @param nodes - Motion nodes with position and radius data
   * @param bubbleGroups - D3 selection of bubble groups
   * @param dimensions - SVG dimensions for centering forces
   */
  private startForceSimulation(nodes: any[], bubbleGroups: any, dimensions: any): void {
    const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget } = this.motionConfig;
    
    this.simulation = d3.forceSimulation(nodes)
      .velocityDecay(decay)
      .alpha(1)
      .alphaMin(alphaMin)
      .alphaTarget(alphaTarget)
      .force('x', d3.forceX(dimensions.width / 2).strength(centerStrength))
      .force('y', d3.forceY(dimensions.height / 2).strength(centerStrength))
      .force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))))
      .on('tick', () => {
        bubbleGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
  }

  /**
   * Stops the force simulation
   */
  private stopSimulation(): void {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }

  /**
   * Update with new data
   * @param data - New data to display
   */
  updateData(data: T[]): void {
    this.chartData = data;
    // Process data using the shared ChartPipeline
    this.processedData = ChartPipeline.processData(
      data,
      this.config
    );
    
    // Re-render with new data
    this.stopSimulation();
    this.update();
  }

  /**
   * Get current motion configuration
   * @returns Current motion configuration
   */
  getMotionConfig(): Required<MotionConfig> {
    return { ...this.motionConfig };
  }

  /**
   * Update motion configuration and apply changes
   * @param newConfig - Partial motion configuration to merge
   * @returns this for method chaining
   */
  setMotionConfig(newConfig: Partial<MotionConfig>): this {
    this.motionConfig = { ...this.motionConfig, ...newConfig };
    
    // Update existing simulation if running
    if (this.simulation) {
      const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget } = this.motionConfig;
      
      this.simulation
        .velocityDecay(decay)
        .alphaMin(alphaMin)
        .alphaTarget(alphaTarget);
        
      // Update force strengths
      const svgElements = this.svgManager.getElements();
      if (svgElements) {
        this.simulation
          .force('x', d3.forceX(svgElements.dimensions.width / 2).strength(centerStrength))
          .force('y', d3.forceY(svgElements.dimensions.height / 2).strength(centerStrength))
          .force('collision', d3.forceCollide()
            .radius((d: any) => d.r + collidePadding)
            .strength(Math.max(0, Math.min(1, repulseStrength))));
      }
    }
    
    return this;
  }

  /**
   * Clean up resources and stop simulation
   */
  override destroy(): void {
    this.stopSimulation();
    super.destroy();
  }
} 