import * as d3 from 'd3';
import { BaseChartBuilder } from '../core/index.js';
import type { BubbleChartOptions } from '../config/index.js';
import type { BubbleChartData } from '../data/index.js';
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
  private isFiltered: boolean = false;
  private currentFilter: string | null = null;
  private filterGroups: Map<string, any[]> = new Map();
  private filterLabels: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

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
        return;
      }

      const { svg, dimensions } = svgElements;

      // Create scales using the shared ChartPipeline
      const radiusScale = ChartPipeline.createRadiusScale(
        this.processedData,
        [8, Math.min(dimensions.width, dimensions.height) / 12]
      );
      
      const { colorScale, theme } = ChartPipeline.createColorScale(
        this.processedData,
        this.config
      );

      // Apply theme background
      ChartPipeline.applyTheme(svgElements, theme);
      
      // Create motion nodes with random initial positions
      const motionNodes = this.processedData.map((d) => {
        const node = {
          data: d,
          r: radiusScale(d.size),
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height
        };
        return node;
      });
      

      // Create bubble groups and elements
      const bubbleGroups = svg.selectAll('g.bubble')
        .data(motionNodes)
        .enter()
        .append('g')
        .attr('class', 'bubble-chart bubble');

      // Create circles with motion-specific styling
      ChartPipeline.renderCircles(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        colorAccessor: (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'),
        strokeColor: '#fff',
        strokeWidth: 1.5,
        opacity: 0.85,
        initialRadius: 0,
        initialOpacity: 0
      });

      // Add text labels using centralized rendering
      ChartPipeline.renderLabels(bubbleGroups, {
        radiusAccessor: (d: any) => d.r,
        labelAccessor: (d: any) => d.data?.label || d.label || '',
        textColor: 'white',
        formatFunction: this.config.format?.text ? this.config.format.text : undefined,
        initialOpacity: 1 // Motion bubbles don't use entrance animations
      });

      // Use InteractionManager for event handling
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);

      // Add interactive filtering if enabled
      if (this.config.interactiveFiltering) {
        this.setupInteractiveFiltering(bubbleGroups, motionNodes, dimensions);
      }

      // Start force simulation for continuous motion
      this.startForceSimulation(motionNodes, bubbleGroups, dimensions);

    } catch (error) {
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
   * Programmatically trigger spatial filtering by a specific field
   * @param filterField - The field to filter by (e.g., 'region', 'year', 'income')
   */
  triggerSpatialFilter(filterField?: string): void {
    const svgElements = this.svgManager.getElements();
      if (!svgElements || !this.simulation) {
        return;
      }

      // Get nodes from the simulation
      const nodes = this.simulation.nodes();
      if (!nodes || nodes.length === 0) return;

    // If no field specified, reset the filter
    if (!filterField) {
      this.resetFilter(nodes, svgElements.dimensions);
      return;
    }

    // Update the color field to match the filter field
    this.config.colour = filterField;
    
    // Find a sample value from the first node to trigger filtering
    const sampleNode = nodes[0];
    // The actual data is nested in node.data.data due to processForVisualization
    const originalData = sampleNode.data.data || sampleNode.data;
    const filterValue = originalData[filterField];
    
    if (filterValue) {
      this.applyFilter(filterValue, nodes, svgElements.dimensions);
    }
  }

  /**
   * Setup interactive filtering - clicking bubbles spatially separates by group
   */
  private setupInteractiveFiltering(bubbleGroups: any, nodes: any[], dimensions: any): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    // Override click handler for filtering
    bubbleGroups.on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      const filterField = typeof this.config.colour === 'string' ? this.config.colour : 'group';
      const originalData = d.data.data || d.data;
      const filterValue = originalData[filterField];
      
      if (filterValue) {
        this.applyFilter(filterValue, nodes, dimensions);
      }
    });

    // Click on background to reset
    svgElements.svg.on('click', (event: MouseEvent) => {
      if (event.target === svgElements.svg.node()) {
        this.resetFilter(nodes, dimensions);
      }
    });
  }

  /**
   * Apply spatial filtering to separate bubbles by category
   */
  private applyFilter(filterValue: string, nodes: any[], dimensions: any): void {
    if (this.isFiltered && this.currentFilter === filterValue) {
      // If clicking the same filter, reset
      this.resetFilter(nodes, dimensions);
      return;
    }

    this.isFiltered = true;
    this.currentFilter = filterValue;
    
    // Group nodes by filter value
    this.filterGroups.clear();
    const filterField = typeof this.config.colour === 'string' ? this.config.colour : 'group';
    
    nodes.forEach(node => {
      // Access the original data which is nested
      const originalData = node.data.data || node.data;
      const groupValue = originalData[filterField] || 'Other';
      if (!this.filterGroups.has(groupValue)) {
        this.filterGroups.set(groupValue, []);
      }
      this.filterGroups.get(groupValue)!.push(node);
    });

    // Calculate cluster positions
    const groups = Array.from(this.filterGroups.keys());
    const angleStep = (2 * Math.PI) / groups.length;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const clusterRadius = Math.min(dimensions.width, dimensions.height) * 0.3;

    // Update force simulation for clustering
    if (this.simulation) {
      
      // Remove ALL existing forces to prevent conflicts
      this.simulation.force('x', null);
      this.simulation.force('y', null);
      this.simulation.force('collision', null);
      
      // Create a single combined force for each node
      const targetPositions = new Map();
      
      groups.forEach((group, i) => {
        const angle = i * angleStep;
        const targetX = centerX + Math.cos(angle) * clusterRadius;
        const targetY = centerY + Math.sin(angle) * clusterRadius;
        
        // Store target positions for each group
        targetPositions.set(group, { x: targetX, y: targetY });
        
        // Count nodes in this group
        let nodesInGroup = 0;
        nodes.forEach(node => {
          const originalData = node.data.data || node.data;
          if (originalData[filterField] === group) {
            nodesInGroup++;
          }
        });
      });
      
      // Apply a single X force that handles all groups
      this.simulation.force('filter-x', d3.forceX()
        .strength(0.2)  // Reduced from 0.5 for gentler grouping
        .x((d: any) => {
          const originalData = d.data.data || d.data;
          const nodeGroup = originalData[filterField] || 'Other';
          const target = targetPositions.get(nodeGroup);
          return target ? target.x : centerX;
        }));
        
      // Apply a single Y force that handles all groups  
      this.simulation.force('filter-y', d3.forceY()
        .strength(0.2)  // Reduced from 0.5 for gentler grouping
        .y((d: any) => {
          const originalData = d.data.data || d.data;
          const nodeGroup = originalData[filterField] || 'Other';
          const target = targetPositions.get(nodeGroup);
          return target ? target.y : centerY;
        }));
      
      // Re-add collision force with adjusted parameters for grouping
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + 1) // Reduced padding
        .strength(0.7)); // Increased collision to prevent overlap
      
      // Update velocity decay for smoother animation
      this.simulation.velocityDecay(0.4);
      
      
      // Restart simulation with higher alpha
      this.simulation.alpha(1).restart();
      
      // Check if simulation is running
      setTimeout(() => {
      }, 100);
    }

    // Add filter labels
    this.renderFilterLabels(groups, dimensions, centerX, centerY, clusterRadius, angleStep);
  }

  /**
   * Reset filtering and return to normal motion
   */
  private resetFilter(_nodes: any[], dimensions: any): void {
    this.isFiltered = false;
    this.currentFilter = null;
    
    // Remove filter forces and restore original forces
    if (this.simulation) {
      // Remove all filter forces
      const groups = Array.from(this.filterGroups.keys());
      groups.forEach(group => {
        this.simulation!.force(`filter-x-${group}`, null);
        this.simulation!.force(`filter-y-${group}`, null);
      });
      
      // Clear the filter groups after removing forces
      this.filterGroups.clear();

      // Remove specific filter forces first
      this.simulation.force('filter-x', null);
      this.simulation.force('filter-y', null);
      
      // Restore original center forces
      const { centerStrength } = this.motionConfig;
      this.simulation.force('x', d3.forceX(dimensions.width / 2).strength(centerStrength));
      this.simulation.force('y', d3.forceY(dimensions.height / 2).strength(centerStrength));
      
      // Restart simulation
      this.simulation.alpha(0.5).restart();
    }

    // Remove filter labels
    this.removeFilterLabels();
  }

  /**
   * Render labels for each filter group
   */
  private renderFilterLabels(groups: string[], _dimensions: any, centerX: number, centerY: number, radius: number, angleStep: number): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    // Remove existing labels
    this.removeFilterLabels();

    // Create label group
    this.filterLabels = svgElements.svg.append('g')
      .attr('class', 'filter-labels');

    // Add labels for each group
    groups.forEach((group, i) => {
      const angle = i * angleStep;
      const labelX = centerX + Math.cos(angle) * (radius + 50);
      const labelY = centerY + Math.sin(angle) * (radius + 50);
      const count = this.filterGroups.get(group)?.length || 0;

      const labelGroup = this.filterLabels!.append('g')
        .attr('transform', `translate(${labelX}, ${labelY})`);

      // Background rect
      const text = labelGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333');

      text.append('tspan')
        .text(group);
      
      text.append('tspan')
        .attr('x', 0)
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('font-weight', 'normal')
        .text(`(${count})`);
    });
  }

  /**
   * Remove filter labels from the chart
   */
  private removeFilterLabels(): void {
    if (this.filterLabels) {
      this.filterLabels.remove();
      this.filterLabels = null;
    }
  }

  /**
   * Clean up resources and stop simulation
   */
  override destroy(): void {
    this.stopSimulation();
    this.removeFilterLabels();
    super.destroy();
  }
}
