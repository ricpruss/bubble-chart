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

// Removed getBoundedPosition - using inline D3 approach for better performance

/**
 * MotionBubble – animated, continuously moving bubbles using d3-force.
 * Migrated to compositional architecture with preserved force simulation.
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class MotionBubble<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  private motionConfig: Required<MotionConfig>;
  private simulation: d3.Simulation<any, undefined> | null = null;
  private isResponsiveSetup: boolean = false;

  private isFiltered: boolean = false;
  private currentFilter: string | null = null;
  private filterGroups: Map<string, any[]> = new Map();
  private filterLabels: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private categoryTypePositions: Map<string, {x: number, y: number}> = new Map(); // Category type spawn positions (absolute)
  private normalizedPositions: Map<string, {x: number, y: number}> = new Map(); // Category positions (0-1 normalized)
  private positionsInitialized: boolean = false; // Track if positions have been set up
  private lastCanvasWidth: number = 0;
  private lastCanvasHeight: number = 0;
  private maxDataValue: number = 0; // Track maximum data value across all updates for stable scaling

  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'motion' as const };
    super(mutableConfig);
    
    // Merge animation defaults with user config for smooth animations
    this.motionConfig = {
      repulseStrength: 0.8,   // Strong collision strength to prevent overlap
      decay: 0.2,             // Higher decay = smoother, less oscillation
      collidePadding: 8,      // Sufficient padding between bubbles for all sizes
      centerStrength: 0.05,
      alphaMin: 0.001,        // Higher min = stops sooner for stability
      alphaTarget: 0.01,      // Lower target = calmer ongoing motion
      ...(this.config.animation as MotionConfig || {})
    };
    
    // Initialize fixed positions for the three known analysis types
    // This prevents violent movement by avoiding dynamic recalculation
    this.setupFixedCategoryPositions();
    // Don't set positionsInitialized to true here - we need to scale them on first render
  }

  /**
   * Renders motion bubbles with force simulation using proper D3 enter-update-exit pattern
   */
  protected performRender(): void {
    try {
      if (!this.chartData || this.chartData.length === 0) {
        // Handle empty data case
        this.clearBubbles();
        return;
      }

      // Process data using the shared ChartPipeline
      this.processedData = ChartPipeline.processData(
        this.chartData,
        this.config
      );
      
      // Get SVG elements from building blocks
      const svgElements = this.svgManager.getElements();
      if (!svgElements) {
        return;
      }

      const { svg, dimensions } = svgElements;

      // Set up responsive behavior to handle radius recalculation on resize (only once)
      if (!this.isResponsiveSetup) {
        this.svgManager.makeResponsive({
          onResize: () => {
            this.handleResize();
          },
          debounceMs: 150 // Faster response for smooth radius updates
        });
        this.isResponsiveSetup = true;
      }

      // Create scales using the shared ChartPipeline
      // Advanced density-aware scaling for optimal page utilization
      
      // Update maximum data value for stable scaling across dynamic updates
      const currentMaxValue = d3.max(this.processedData, (d: any) => d.size) || 0;
      const currentMinValue = d3.min(this.processedData, (d: any) => d.size) || 0;
      this.maxDataValue = Math.max(this.maxDataValue, currentMaxValue);
      
      // Calculate density-aware radius scaling
      const { minRadius, maxRadius } = this.calculateDensityAwareRadius(dimensions, this.processedData.length);
      
      // Create custom radius scale with stable domain to prevent jarring scale jumps
      // Handle negative values by using absolute values for radius calculation
      const hasNegativeValues = currentMinValue < 0;
      
      let radiusScale;
      if (hasNegativeValues) {
        // For data with negative values, use absolute values for sizing
        // but ensure minimum visibility for all bubbles
        const maxAbsValue = Math.max(Math.abs(currentMinValue), this.maxDataValue);
        radiusScale = (value: number) => {
          const absValue = Math.abs(value);
          const normalizedValue = absValue / maxAbsValue;
          return minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedValue);
        };
      } else {
        // Standard sqrt scale for positive values only
        radiusScale = d3.scaleSqrt()
          .domain([0, this.maxDataValue])
          .range([minRadius, maxRadius])
          .clamp(true);
      }
      
      const { colorScale, theme } = ChartPipeline.createColorScale(
        this.processedData,
        this.config
      );

      // Apply theme background
      ChartPipeline.applyTheme(svgElements, theme);
      
      // Create motion nodes, preserving existing nodes from simulation
      const existingNodes = this.simulation ? this.simulation.nodes() : [];
      const existingNodeMap = new Map();
      
      // Create lookup map for existing nodes
      existingNodes.forEach(node => {
        const key = node.data.id || node.data.label || JSON.stringify(node.data);
        existingNodeMap.set(key, node);
      });
      
      // Update positions only if canvas size changed
      this.updatePositionsForCanvasSize(dimensions);
      
      // Separate existing and new nodes
      const existingMotionNodes: any[] = [];
      const newNodes: any[] = [];
      
      this.processedData.forEach((d) => {
        const key = d.id || d.label || JSON.stringify(d);
        const existingNode = existingNodeMap.get(key);
        
        if (existingNode) {
          // Update existing node data but preserve position and velocity
          existingNode.data = d;
          existingNode.r = radiusScale(d.size);
          
          existingMotionNodes.push(existingNode);
        } else {
          // Create new node with category type-based initial position
          const analysisType = d.analysisType || 'default';
          const position = this.getInitialPositionForType(analysisType);
          
          const radius = radiusScale(d.size);
          
          // Constrain initial position to viewport bounds considering bubble radius
          const padding = Math.max(5, radius * 0.1);
          const constrainedPosition = {
            x: Math.max(radius + padding, Math.min(dimensions.width - radius - padding, position.x)),
            y: Math.max(radius + padding, Math.min(dimensions.height - radius - padding, position.y))
          };
          
          const node = {
            data: d,
            r: radius,
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            vx: 0,
            vy: 0
          };
          newNodes.push(node);
        }
      });
      
      // First, render only existing nodes
      const motionNodes = [...existingMotionNodes];
      
      // Use D3's enter-update-exit pattern with proper key function
      const bubbleGroups = svg.selectAll('g.bubble')
        .data(motionNodes, (d: any) => d.data.id || d.data.label || JSON.stringify(d.data))
        .join(
          // ENTER: Create new bubbles
          (enter: any) => {
            const enterGroups = enter
              .append('g')
              .attr('class', 'bubble-chart bubble')
              .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

            // Create circles for new bubbles - simplified approach
            enterGroups.selectAll('circle')
              .data((d: any) => [d])
              .join('circle')
              .attr('r', (d: any) => d.r)
              .style('opacity', 0.85)
              .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
              .attr('stroke', '#fff')
              .attr('stroke-width', 1.5);

            // Add text labels for new bubbles
            ChartPipeline.renderLabels(enterGroups, {
              radiusAccessor: (d: any) => d.r,
              labelAccessor: (d: any) => d.data?.label || d.label || '',
              textColor: 'white',
              formatFunction: this.config.format?.text ? this.config.format.text : undefined,
              initialOpacity: 1
            });

            // Animate entrance
            enterGroups.style('opacity', 0)
              .transition()
              .duration(500)
              .style('opacity', 1);

            return enterGroups;
          },
          // UPDATE: Update existing bubbles
          (update: any) => {
            // Update positions and properties of existing bubbles
            update.select('circle')
              .transition()
              .duration(300)
              .attr('r', (d: any) => d.r)
              .style('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'));

            update.select('text')
              .transition()
              .duration(300)
              .text((d: any) => d.data?.label || d.label || '');

            return update;
          },
          // EXIT: Remove old bubbles
          (exit: any) => {
            exit.transition()
              .duration(300)
              .style('opacity', 0)
              .remove();
            return exit;
          }
        );

      // Use InteractionManager for event handling
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);

      // Add interactive filtering if enabled
      if (this.config.interactiveFiltering) {
        this.setupInteractiveFiltering(bubbleGroups, motionNodes, dimensions);
      }

      // Start or update force simulation
      this.updateForceSimulation(motionNodes, bubbleGroups, dimensions);
      
      // Add new nodes directly without staggering
      if (newNodes.length > 0) {
        this.addNodesDirectly(newNodes, svg, colorScale);
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Starts the D3.js force simulation for continuous motion with category-specific forces
   * @param nodes - Motion nodes with position and radius data
   * @param bubbleGroups - D3 selection of bubble groups
   * @param dimensions - SVG dimensions for centering forces
   */
  private startForceSimulation(nodes: any[], _bubbleGroups: any, dimensions: any): void {
    const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget } = this.motionConfig;
    
    // Get current dimensions for boundary calculations
    const getCurrentDimensions = () => {
      const svgElements = this.svgManager.getElements();
      return svgElements ? svgElements.dimensions : dimensions;
    };
    
    this.simulation = d3.forceSimulation(nodes)
      .velocityDecay(decay)
      .alpha(0.6)  // Gentler initial startup energy for smoother animation
      .alphaMin(alphaMin)
      .alphaTarget(alphaTarget)  // Maintain gentle ongoing motion
      // Category-specific forces instead of global center
      .force('category-x', d3.forceX()
        .strength(centerStrength)
        .x((d: any) => {
          const analysisType = d.data.analysisType || 'default';
          const categoryPos = this.categoryTypePositions.get(analysisType);
          return categoryPos ? categoryPos.x : dimensions.width / 2;
        }))
      .force('category-y', d3.forceY()
        .strength(centerStrength)
        .y((d: any) => {
          const analysisType = d.data.analysisType || 'default';
          const categoryPos = this.categoryTypePositions.get(analysisType);
          return categoryPos ? categoryPos.y : dimensions.height / 2;
        }))
      .force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))))
      // Strong boundary containment forces - always pull toward safe center zones
      .force('boundary-x', d3.forceX()
        .strength(1.0)  // Strong but smooth boundary containment
        .x((d: any) => {
          const dims = getCurrentDimensions();
          const radius = d.r || 0;
          const safeLeft = radius + 20;
          const safeRight = dims.width - radius - 20;
          
          // Always pull toward safe center if outside bounds
          if (d.x < safeLeft) return safeLeft;
          if (d.x > safeRight) return safeRight;
          
          // Even when in bounds, pull slightly toward center for stability
          const center = dims.width / 2;
          const pullFactor = 0.02; // Gentle center pull
          return d.x + (center - d.x) * pullFactor;
        }))
      .force('boundary-y', d3.forceY()
        .strength(1.0)  // Strong but smooth boundary containment
        .y((d: any) => {
          const dims = getCurrentDimensions();
          const radius = d.r || 0;
          const safeTop = radius + 20;
          const safeBottom = dims.height - radius - 20;
          
          // Always pull toward safe center if outside bounds
          if (d.y < safeTop) return safeTop;
          if (d.y > safeBottom) return safeBottom;
          
          // Even when in bounds, pull slightly toward center for stability
          const center = dims.height / 2;
          const pullFactor = 0.02; // Gentle center pull
          return d.y + (center - d.y) * pullFactor;
        }))
      // Minimal tick handler - only DOM updates (no manual physics)
      .on('tick', () => {
        const svgElements = this.svgManager.getElements();
        if (svgElements) {
          svgElements.svg.selectAll('g.bubble')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
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
   * Reset the accumulated maximum data value for radius scaling
   * Useful when starting with completely new data ranges
   */
  resetScaleDomain(): void {
    this.maxDataValue = 0;
  }

  /**
   * Calculate density-aware radius scaling for optimal page utilization
   * Targets ~80% page coverage with adaptive scaling based on bubble count
   * @param dimensions - Container dimensions
   * @param bubbleCount - Number of bubbles to display
   * @returns Object with minRadius and maxRadius values
   */
  private calculateDensityAwareRadius(dimensions: { width: number; height: number }, bubbleCount: number): { minRadius: number; maxRadius: number } {
    const containerArea = dimensions.width * dimensions.height;
    const targetCoverage = 0.8; // Target 80% page utilization
    const targetArea = containerArea * targetCoverage;
    
    // Estimate average bubble area for even distribution
    const avgBubbleArea = targetArea / Math.max(bubbleCount, 1);
    const avgRadius = Math.sqrt(avgBubbleArea / Math.PI);
    
    // Scale factors based on bubble count for better distribution
    let scaleFactor = 1.0;
    if (bubbleCount <= 3) {
      scaleFactor = 1.8; // Fewer bubbles = much larger
    } else if (bubbleCount <= 6) {
      scaleFactor = 1.5; // Small groups = larger
    } else if (bubbleCount <= 12) {
      scaleFactor = 1.2; // Medium groups = slightly larger
    } else if (bubbleCount <= 20) {
      scaleFactor = 1.0; // Good balance
    } else {
      scaleFactor = 0.8; // Many bubbles = smaller to fit
    }
    
    // Calculate adaptive radius range
    const baseMaxRadius = avgRadius * scaleFactor;
    const maxRadius = Math.min(
      baseMaxRadius,
      Math.min(dimensions.width, dimensions.height) / 4 // Never exceed 1/4 of smallest dimension
    );
    
    // Minimum radius scales with max but has reasonable floor
    const minRadius = Math.max(8, maxRadius * 0.15);
    
    return {
      minRadius: Math.round(minRadius),
      maxRadius: Math.round(Math.max(maxRadius, minRadius + 5)) // Ensure reasonable range
    };
  }

  /**
   * @param nodeId - ID of the node to update
   * @param newRadius - New radius value
   */
  updateRadius(nodeId: string, newRadius: number): void {
    if (!this.simulation) {
      console.warn('MotionBubble: Cannot update radius - no simulation running');
      return;
    }

    // Get current nodes from simulation
    const nodes = this.simulation.nodes();
    
    // Find and update the target node
    const targetNode = nodes.find((n: any) => {
      const nodeId_actual = n.data?.id || n.data?.label || JSON.stringify(n.data);
      return nodeId_actual === nodeId;
    });

    if (!targetNode) {
      console.warn(`MotionBubble: Node "${nodeId}" not found for radius update`);
      return;
    }

    // Update the radius
    targetNode.r = newRadius;

    // Re-initialize collision force with new radius (critical!)
    const { collidePadding, repulseStrength } = this.motionConfig;
    this.simulation.force('collision', d3.forceCollide()
      .radius((d: any) => d.r + collidePadding)
      .strength(Math.max(0, Math.min(1, repulseStrength))));

    // Use D3's native restart for smooth animation
    this.simulation.restart();

    // Update the visual circle element
    const svgElements = this.svgManager.getElements();
    if (svgElements) {
      svgElements.svg.selectAll('g.bubble')
        .filter((d: any) => {
          const nodeId_actual = d.data?.id || d.data?.label || JSON.stringify(d.data);
          return nodeId_actual === nodeId;
        })
        .select('circle')
        .transition()
        .duration(300)
        .attr('r', newRadius);
    }
  }

  /**
   * Set density preset (adapts MotionBubble's sophisticated forces)
   * @param preset - Density preset name
   */
  setDensity(preset: 'sparse' | 'balanced' | 'dense' | 'compact'): void {
    if (!this.simulation) {
      console.warn('MotionBubble: Cannot set density - no simulation running');
      return;
    }

    // Adapt density to MotionBubble's existing sophisticated force system
    const densityConfigs = {
      sparse: {
        repulseStrength: 1.0,    // Maximum collision strength = more space
        centerStrength: 0.02,    // Weaker center pull
        collidePadding: 12       // More padding
      },
      balanced: {
        repulseStrength: 0.8,    // New balanced settings (stronger than old defaults)
        centerStrength: 0.05,
        collidePadding: 8
      },
      dense: {
        repulseStrength: 0.6,    // Moderate collision = tighter packing
        centerStrength: 0.08,    // Stronger center pull
        collidePadding: 4        // Less padding
      },
      compact: {
        repulseStrength: 0.4,    // Lower collision
        centerStrength: 0.12,    // Strong center pull
        collidePadding: 2        // Minimal padding
      }
    };

    const config = densityConfigs[preset];
    
    // Update motion config
    this.motionConfig = { ...this.motionConfig, ...config };

    // Update existing forces instead of recreating
    const collisionForce = this.simulation.force('collision') as d3.ForceCollide<any>;
    const categoryXForce = this.simulation.force('category-x') as d3.ForceX<any>;
    const categoryYForce = this.simulation.force('category-y') as d3.ForceY<any>;
    
    if (collisionForce) {
      collisionForce.radius((d: any) => d.r + config.collidePadding);
      collisionForce.strength(Math.max(0, Math.min(1, config.repulseStrength)));
    }
    
    if (categoryXForce) {
      categoryXForce.strength(config.centerStrength);
    }
    
    if (categoryYForce) {
      categoryYForce.strength(config.centerStrength);
    }

    // Use D3's native restart for smooth transition
    this.simulation.restart();
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
        
      // Update existing forces instead of recreating them
      const categoryXForce = this.simulation.force('category-x') as d3.ForceX<any>;
      const categoryYForce = this.simulation.force('category-y') as d3.ForceY<any>;
      const collisionForce = this.simulation.force('collision') as d3.ForceCollide<any>;
      const boundaryXForce = this.simulation.force('boundary-x') as d3.ForceX<any>;
      const boundaryYForce = this.simulation.force('boundary-y') as d3.ForceY<any>;
      
      if (categoryXForce) categoryXForce.strength(centerStrength);
      if (categoryYForce) categoryYForce.strength(centerStrength);
      if (collisionForce) {
        collisionForce.radius((d: any) => d.r + collidePadding);
        collisionForce.strength(Math.max(0, Math.min(1, repulseStrength)));
      }
      if (boundaryXForce) boundaryXForce.strength(1.0);
      if (boundaryYForce) boundaryYForce.strength(1.0);
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
      this.simulation.force('category-x', null);
      this.simulation.force('category-y', null);
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
        .strength(0.6)  // Moderate grouping force, subordinate to boundary forces
        .x((d: any) => {
          const originalData = d.data.data || d.data;
          const nodeGroup = originalData[filterField] || 'Other';
          const target = targetPositions.get(nodeGroup);
          return target ? target.x : centerX;
        }));
        
      // Apply a single Y force that handles all groups  
      this.simulation.force('filter-y', d3.forceY()
        .strength(0.6)  // Moderate grouping force, subordinate to boundary forces
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
      this.simulation.velocityDecay(0.3);
      
      
      // No restart needed - alphaTarget keeps simulation alive
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
      
      // Restore original category-specific forces
      const { centerStrength } = this.motionConfig;
      this.simulation.force('category-x', d3.forceX()
        .strength(centerStrength)
        .x((d: any) => {
          const analysisType = d.data.analysisType || 'default';
          const categoryPos = this.categoryTypePositions.get(analysisType);
          return categoryPos ? categoryPos.x : dimensions.width / 2;
        }));
      this.simulation.force('category-y', d3.forceY()
        .strength(centerStrength)
        .y((d: any) => {
          const analysisType = d.data.analysisType || 'default';
          const categoryPos = this.categoryTypePositions.get(analysisType);
          return categoryPos ? categoryPos.y : dimensions.height / 2;
        }));
      
      // No restart needed - alphaTarget keeps simulation alive
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
   * Clear all bubbles from the chart
   */
  private clearBubbles(): void {
    const svgElements = this.svgManager.getElements();
    if (svgElements) {
      svgElements.svg.selectAll('g.bubble').remove();
    }
    this.stopSimulation();
  }

  /**
   * Update or start force simulation with new nodes
   * @param nodes - Motion nodes with position and radius data
   * @param bubbleGroups - D3 selection of bubble groups
   * @param dimensions - SVG dimensions for centering forces
   */
  private updateForceSimulation(nodes: any[], bubbleGroups: any, dimensions: any): void {
    if (this.simulation) {
      // Set zero initial velocity for all new nodes to prevent flying off screen
      nodes.forEach(node => {
        if (node.vx === undefined) {
          node.vx = 0;
          node.vy = 0;
        }
      });
      
      // Update existing simulation with new nodes
      this.simulation.nodes(nodes);
      
      // Update tick handler to use minimal DOM-only approach (boundary force handles constraints)
      this.simulation.on('tick', () => {
        const svgElements = this.svgManager.getElements();
        if (svgElements) {
          svgElements.svg.selectAll('g.bubble')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
      });
      
      
      // Update collision force radius in case new bubbles have different sizes
      const { collidePadding, repulseStrength } = this.motionConfig;
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))));
      // No restart needed - alphaTarget keeps simulation alive for new bubbles
      
      // Check for any nodes with undefined velocity
      nodes.forEach(node => {
        if (node.vx === undefined || node.vy === undefined) {
          console.warn(`Node with undefined velocity: ${JSON.stringify(node.data)}`);
        }
      });
    } else {
      // Start new simulation if none exists
      this.startForceSimulation(nodes, bubbleGroups, dimensions);
    }
  }



  /**
   * Get the initial position for a given analysis type
   * @param analysisType - The analysis type to get position for
   * @returns The x,y coordinates for this type
   */
  private getInitialPositionForType(analysisType: string): {x: number, y: number} {
    const position = this.categoryTypePositions.get(analysisType);
    
    if (!position) {
      // For general motion bubbles without analysis types, use canvas center
      const svgElements = this.svgManager.getElements();
      if (svgElements) {
        const centerX = svgElements.dimensions.width / 2;
        const centerY = svgElements.dimensions.height / 2;
        return { x: centerX, y: centerY };
      }
      // Fallback to origin if no SVG elements available
      return { x: 0, y: 0 };
    }
    
    return position;
  }

  /**
   * Initialize fixed positions for known analysis types
   * This prevents violent movement by setting up stable positions once
   */
  private setupFixedCategoryPositions(): void {
    // Store normalized positions (0-1 range) with safe margins from edges
    this.normalizedPositions.set('duration', { x: 0.5, y: 0.3 });      // Top center (safe margin)
    this.normalizedPositions.set('viewCount', { x: 0.3, y: 0.7 });     // Bottom left (safe margin)
    this.normalizedPositions.set('verification', { x: 0.7, y: 0.7 });  // Bottom right (safe margin)
  }

  /**
   * Update positions based on canvas dimensions - only if size changed
   * @param dimensions - Canvas dimensions
   */
  private updatePositionsForCanvasSize(dimensions: any): void {
    // Check if canvas size has changed
    const sizeChanged = this.lastCanvasWidth !== dimensions.width || this.lastCanvasHeight !== dimensions.height;
    
    if (!sizeChanged && this.positionsInitialized) {
      return;
    }
    
    // Update cached dimensions
    this.lastCanvasWidth = dimensions.width;
    this.lastCanvasHeight = dimensions.height;
    
    // Scale normalized positions (0-1) to actual canvas dimensions
    // This avoids double-scaling bug by always starting from normalized values
    this.normalizedPositions.forEach((normalizedPos, type) => {
      const absolutePos = {
        x: normalizedPos.x * dimensions.width,
        y: normalizedPos.y * dimensions.height
      };
      this.categoryTypePositions.set(type, absolutePos);
    });
    
    this.positionsInitialized = true;
    
    // Update force simulation with new category positions
    this.updateCategoryForces(dimensions);
  }

  /**
   * Update the D3 force simulation's category forces with current positions
   * This is necessary because forces are closures that capture positions at creation time
   */
  private updateCategoryForces(dimensions: any): void {
    if (!this.simulation) {
      return;
    }

    const { centerStrength } = this.motionConfig;

    // Update category forces with new positions (need to recreate due to target function changes)
    this.simulation.force('category-x', d3.forceX()
      .strength(centerStrength)
      .x((d: any) => {
        const analysisType = d.data.analysisType || 'default';
        const categoryPos = this.categoryTypePositions.get(analysisType);
        return categoryPos ? categoryPos.x : dimensions.width / 2;
      }));

    this.simulation.force('category-y', d3.forceY()
      .strength(centerStrength)
      .y((d: any) => {
        const analysisType = d.data.analysisType || 'default';
        const categoryPos = this.categoryTypePositions.get(analysisType);
        return categoryPos ? categoryPos.y : dimensions.height / 2;
      }));

    // Update boundary forces with new dimensions (need to recreate due to target function changes)
    this.simulation.force('boundary-x', d3.forceX()
      .strength(1.0)
      .x((d: any) => {
        const radius = d.r || 0;
        const safeLeft = radius + 20;
        const safeRight = dimensions.width - radius - 20;
        
        // Always pull toward safe center if outside bounds
        if (d.x < safeLeft) return safeLeft;
        if (d.x > safeRight) return safeRight;
        
        // Even when in bounds, pull slightly toward center for stability
        const center = dimensions.width / 2;
        const pullFactor = 0.02; // Gentle center pull
        return d.x + (center - d.x) * pullFactor;
      }));
    
    this.simulation.force('boundary-y', d3.forceY()
      .strength(1.0)
      .y((d: any) => {
        const radius = d.r || 0;
        const safeTop = radius + 20;
        const safeBottom = dimensions.height - radius - 20;
        
        // Always pull toward safe center if outside bounds
        if (d.y < safeTop) return safeTop;
        if (d.y > safeBottom) return safeBottom;
        
        // Even when in bounds, pull slightly toward center for stability
        const center = dimensions.height / 2;
        const pullFactor = 0.02; // Gentle center pull
        return d.y + (center - d.y) * pullFactor;
      }));


  }

  
  /**
   * Add nodes with staggered entry animation
   * @param nodes - Array of new nodes to add
   * @param svg - SVG element
   * @param colorScale - Color scale function
   */
  private addNodesDirectly(nodes: any[], svg: any, colorScale: any): void {
    if (!this.simulation) return;
    
    // Add nodes with staggered timing for better visual effect
    nodes.forEach((node, index) => {
      setTimeout(() => {
        // Add this node to the simulation
        const currentNodes = this.simulation ? this.simulation.nodes() : [];
        const updatedNodes = [...currentNodes, node];
        this.simulation?.nodes(updatedNodes);
        
        // Create the visual bubble for this node
        const newBubbleGroup = svg.append('g')
          .datum(node)
          .attr('class', 'bubble-chart bubble')
          .attr('transform', `translate(${node.x},${node.y})`)
          .style('opacity', 0);
        
        // Add circle
        newBubbleGroup.append('circle')
          .attr('r', node.r)
          .style('opacity', 0.85)
          .attr('fill', node.data.colorValue ? colorScale(node.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
        
        // Add label
        ChartPipeline.renderLabels(newBubbleGroup, {
          radiusAccessor: () => node.r,
          labelAccessor: () => node.data?.label || node.label || '',
          textColor: 'white',
          formatFunction: this.config.format?.text ? this.config.format.text : undefined,
          initialOpacity: 1
        });
        
        // Animate entrance with scale effect
        newBubbleGroup.select('circle')
          .attr('r', 0)
          .transition()
          .duration(600)
          .ease(d3.easeBackOut.overshoot(1.2))
          .attr('r', node.r);
        
        newBubbleGroup.transition()
          .duration(400)
          .style('opacity', 1);
        
        // Add event handlers
        ChartPipeline.attachStandardEvents(newBubbleGroup, this.interactionManager);
        
        // Update collision force to include new nodes
        const { collidePadding, repulseStrength } = this.motionConfig;
        this.simulation?.force('collision', d3.forceCollide()
          .radius((d: any) => d.r + collidePadding)
          .strength(Math.max(0, Math.min(1, repulseStrength))));
      }, index * 150); // Stagger by 150ms per bubble
    });
  }

  /**
   * Calculate optimal density preset based on node count and available area
   * @param nodeCount - Number of nodes in the simulation
   * @param area - Available container area (width * height)
   * @returns Optimal density preset
   */
  private calculateOptimalDensity(nodeCount: number, area: number): 'sparse' | 'balanced' | 'dense' | 'compact' {
    const nodePerArea = nodeCount / area;
    const scaledDensity = nodePerArea * 1000000; // Scale for easier thresholds
    
    if (scaledDensity < 0.5) {
      return 'sparse';
    } else if (scaledDensity < 1.5) {
      return 'balanced';
    } else if (scaledDensity < 3.0) {
      return 'dense';
    } else {
      return 'compact';
    }
  }

  /**
   * Comprehensive resize handler that recalculates density, positions, and bubble sizes
   * Should be called when viewport or container dimensions change significantly
   * 
   * Features:
   * - Automatically calculates optimal density based on viewport size and node count
   * - Applies viewport-specific optimizations (mobile/tablet/desktop)
   * - Recalculates bubble sizes with responsive scaling factors
   * - Immediately constrains any out-of-bounds bubbles to new viewport
   * - Updates force simulation with current dimensions (fixes stale dimension bug)
   * - Provides smooth transitions with device-appropriate animation durations
   */
  private handleResize(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements || !this.simulation) {
      return;
    }
    
    const { dimensions } = svgElements;
    const nodes = this.simulation.nodes();
    const nodeCount = nodes.length;
    
    if (nodeCount === 0) return;
    

    
    // 1. Recalculate optimal density based on new container size
    const area = dimensions.width * dimensions.height;
    const optimalDensity = this.calculateOptimalDensity(nodeCount, area);
    
    // 2. Apply viewport-specific adjustments
    const aspectRatio = dimensions.width / dimensions.height;
    const isMobile = dimensions.width < 768;
    const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
    const isPortrait = aspectRatio < 1;
    
    let adjustedDensity = optimalDensity;
    
    // Adjust density for different viewport types
    if (isMobile) {
      // Mobile devices: prefer less dense for touch interaction
      if (adjustedDensity === 'compact') adjustedDensity = 'dense';
      if (adjustedDensity === 'dense') adjustedDensity = 'balanced';
    } else if (isTablet && isPortrait) {
      // Tablet portrait: moderate density
      if (adjustedDensity === 'compact') adjustedDensity = 'dense';
    }
    
    // 3. Apply new density (this updates force simulation parameters)
    this.setDensity(adjustedDensity);
    
    // 4. Update category positions for new canvas size
    this.updatePositionsForCanvasSize(dimensions);
    
    // 5. Ensure category forces are updated with new positions (critical for resize)
    this.updateCategoryForces(dimensions);
    
    // 6. Recalculate bubble radii for new container area with viewport-specific scaling
    const { minRadius, maxRadius } = this.calculateDensityAwareRadius(dimensions, nodeCount);
    
    // Apply viewport-specific radius scaling
    let radiusScale: (value: number) => number;
    const baseScale = d3.scaleSqrt()
      .domain([0, this.maxDataValue])
      .range([minRadius, maxRadius])
      .clamp(true);
    
    if (isMobile) {
      // Slightly larger bubbles on mobile for better touch targets
      radiusScale = (value: number) => Math.max(baseScale(value) * 1.1, 12);
    } else if (isTablet) {
      // Moderate scaling for tablets
      radiusScale = (value: number) => Math.max(baseScale(value) * 1.05, 10);
    } else {
      // Standard scaling for desktop
      radiusScale = baseScale;
    }
    
    // Update maximum data value from current nodes if needed
    const currentMaxValue = d3.max(nodes, (d: any) => d.data?.size || d.size) || 0;
    this.maxDataValue = Math.max(this.maxDataValue, currentMaxValue);
    
    // 7. Update node radii in simulation and DOM
    nodes.forEach(node => {
      const newRadius = radiusScale(node.data?.size || node.size || 0);
      node.r = newRadius;

    });
    
    // 8. Update visual elements with device-appropriate animation duration
    const animationDuration = isMobile ? 300 : 500; // Faster animations on mobile
    svgElements.svg.selectAll('g.bubble circle')
      .transition()
      .duration(animationDuration)
      .attr('r', (d: any) => d.r);
    
    // 9. Let the D3-native boundary force handle constraint enforcement
    // The force system will automatically constrain nodes on the next tick
    
    // 10. Re-initialize collision force with new radii
    const { collidePadding, repulseStrength } = this.motionConfig;
    this.simulation.force('collision', d3.forceCollide()
      .radius((d: any) => d.r + collidePadding)
      .strength(Math.max(0, Math.min(1, repulseStrength))));
    
    // 11. Boost simulation energy for smooth transition (less aggressive on mobile)
        // Use D3's native restart for resize transitions
    this.simulation.restart();


  }

  /**
   * Public method to trigger responsive recalculation
   * Can be called externally when container size changes
   */
  public triggerResize(): void {
    this.handleResize();
  }

  /**
   * Debug method to check all bubble positions and log any that are out of bounds
   * Can be called externally for debugging viewport issues
   */
  public debugBubblePositions(): void {
    if (!this.simulation) {
      console.log('DEBUG: No simulation active');
      return;
    }

    const svgElements = this.svgManager.getElements();
    if (!svgElements) {
      console.log('DEBUG: No SVG elements available');
      return;
    }

    const nodes = this.simulation.nodes();
    const { width, height } = svgElements.dimensions;
    let outOfBoundsCount = 0;

    console.log(`DEBUGGING ${nodes.length} bubbles in ${width}×${height} viewport:`);

    nodes.forEach((node, index) => {
      const radius = node.r || 0;
      const leftEdge = node.x - radius;
      const rightEdge = node.x + radius;
      const topEdge = node.y - radius;
      const bottomEdge = node.y + radius;

      const isOutOfBounds = leftEdge < 0 || rightEdge > width || topEdge < 0 || bottomEdge > height;
      
      if (isOutOfBounds) {
        outOfBoundsCount++;
        console.log(`   Bubble ${index}: (${node.x.toFixed(0)}, ${node.y.toFixed(0)}) radius=${radius.toFixed(0)} - Edges: L=${leftEdge.toFixed(0)}, R=${rightEdge.toFixed(0)}, T=${topEdge.toFixed(0)}, B=${bottomEdge.toFixed(0)}`);
      }
    });

    console.log(`SUMMARY: ${outOfBoundsCount}/${nodes.length} bubbles are out of bounds`);
  }



  /**
   * Clean up resources and stop simulation
   */
  override destroy(): void {
    this.stopSimulation();
    this.removeFilterLabels();
    this.isResponsiveSetup = false; // Reset for potential reinitialization
    super.destroy();
  }
}
