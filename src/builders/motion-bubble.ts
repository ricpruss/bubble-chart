import * as d3 from 'd3';
import { BaseChartBuilder } from '../core/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import type { BubbleChartData } from '../types/index.js';
import { D3DataUtils } from '../d3/index.js';

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
  /** Initial velocity range for entering bubbles */
  initialVelocity?: number;
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
      initialVelocity: 30,
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

      // Process data with color accessor using D3DataUtils
      const colorConfig = this.config.color;
      const colorAccessor = (typeof colorConfig === 'string' || typeof colorConfig === 'function') 
        ? colorConfig as (string | ((d: BubbleChartData) => string))
        : undefined;
      
      this.processedData = D3DataUtils.processForVisualization(
        this.chartData,
        this.config.label || 'label',
        this.config.size || 'size',
        colorAccessor
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

      // Create scales using D3DataUtils
      const radiusScale = D3DataUtils.createRadiusScale(
        this.processedData,
        (d) => d.size,
        [8, Math.min(dimensions.width, dimensions.height) / 12]
      );
      
      // Create motion nodes with random initial positions and velocity
      const { initialVelocity } = this.motionConfig;
      const motionNodes = this.processedData.map((d) => ({
        data: d,
        r: radiusScale(d.size),
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        // Add initial velocity for dynamic entry
        vx: (Math.random() - 0.5) * initialVelocity,
        vy: (Math.random() - 0.5) * initialVelocity
      }));

      // Create key function for D3 data joins - enables proper enter/update/exit lifecycle
      const keyFunction = this.config.keyFunction 
        ? (d: any) => {
            // The data structure is: d.data contains the processed data with original data in d.data.data
            const originalData = d.data.data || d.data;
            return this.config.keyFunction!(originalData);
          }
        : (d: any) => d.data.label || JSON.stringify(d.data);

      // Create bubble groups using D3's native data binding with key function
      const bubbleGroups = svg.selectAll('.bubble')
        .data(motionNodes, keyFunction)
        .join(
          // ENTER: New bubbles
          (enter: any) => {
            return enter.append('g')
              .attr('class', 'bubble')
              .style('cursor', 'pointer');
          },
          // UPDATE: Existing bubbles - update their simulation nodes
          (update: any) => {
            // Update the simulation nodes with new data
            update.each((d: any, i: number) => {
              if (this.simulation) {
                const nodes = this.simulation.nodes();
                if (nodes[i]) {
                  // Update the existing node with new data while preserving position
                  Object.assign(nodes[i], {
                    data: d.data,
                    r: d.r
                    // Keep existing x, y, vx, vy for smooth transitions
                  });
                }
              }
            });
            return update;
          },
          // EXIT: Bubbles to remove
          (exit: any) => {
            return exit.remove();
          }
        );

      // Create color scale for bubbles using professional palette
      const colorValues = D3DataUtils.getUniqueValues(this.processedData, 'colorValue');
      const colorScale = colorValues.length > 0 ? 
        d3.scaleOrdinal()
          .domain(colorValues)
          .range([
            '#D32F2F', '#1976D2', '#00796B', '#F57C00', '#388E3C', '#7B1FA2',
            '#5D4037', '#455A64', '#C2185B', '#303F9F', '#689F38', '#E64A19', '#512DA8'
          ]) :
        () => this.config.defaultColor || '#1976D2';

      // Handle circles with proper enter/update/exit
      bubbleGroups.selectAll('circle')
        .data((d: any) => [d]) // One circle per bubble group
        .join(
          (enter: any) => {
            return enter.append('circle')
              .attr('r', (d: any) => d.r)
              .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1976D2'))
              .attr('stroke', '#fff')
              .attr('stroke-width', 1.5)
              .attr('opacity', 0.9)
              .style('cursor', 'pointer');
          },
          (update: any) => update
            .attr('r', (d: any) => d.r)
            .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1976D2')),
          (exit: any) => exit.remove()
        );

      // Handle labels with proper enter/update/exit
      bubbleGroups.selectAll('text')
        .data((d: any) => [d]) // One label per bubble group
        .join(
          (enter: any) => enter.append('text')
            .attr('class', 'bubble')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', (d: any) => {
              const label = d.data.label;
              const formattedLabel = this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
              return `${D3DataUtils.calculateOptimalFontSize(formattedLabel, d.r)}px`;
            })
            .text((d: any) => {
              const label = d.data.label;
              return this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
            }),
          (update: any) => update
            .style('font-size', (d: any) => {
              const label = d.data.label;
              const formattedLabel = this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
              return `${D3DataUtils.calculateOptimalFontSize(formattedLabel, d.r)}px`;
            })
            .text((d: any) => {
              const label = d.data.label;
              return this.config.format?.text ? this.config.format.text(label) : D3DataUtils.formatLabel(label, 15);
            }),
          (exit: any) => exit.remove()
        );

      // Attach events using centralized InteractionManager
      this.attachEvents(bubbleGroups);

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
        // Apply boundary wrapping for bubbles that leave the screen
        nodes.forEach((d: any) => {
          // Wrap horizontally
          if (d.x + d.r < 0) {
            d.x = dimensions.width + d.r;
          } else if (d.x - d.r > dimensions.width) {
            d.x = -d.r;
          }
          
          // Wrap vertically
          if (d.y + d.r < 0) {
            d.y = dimensions.height + d.r;
          } else if (d.y - d.r > dimensions.height) {
            d.y = -d.r;
          }
        });
        
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
      const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget, initialVelocity } = this.motionConfig;
      
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
      
      // If initialVelocity was updated, apply to existing nodes
      if (newConfig.initialVelocity !== undefined) {
        const nodes = this.simulation.nodes();
        nodes.forEach(node => {
          node.vx = (node.vx || 0) + (Math.random() - 0.5) * initialVelocity * 0.3;
          node.vy = (node.vy || 0) + (Math.random() - 0.5) * initialVelocity * 0.3;
        });
        this.simulation.alpha(0.3).restart();
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
