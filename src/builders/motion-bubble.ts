import * as d3 from 'd3';
import { BaseChartBuilder } from '../core/base.js';
import type { BubbleChartOptions, BubbleChartData } from '../types.js';
import { ChartPipeline } from '../core/pipeline.js';
import { CategoryPositionManager } from '../core/coordinates.js';

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
  private isResponsiveSetup: boolean = false;

  private isFiltered: boolean = false;
  private currentFilter: string | null = null;
  private filterGroups: Map<string, any[]> = new Map();
  private filterLabels: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private positionManager: CategoryPositionManager = new CategoryPositionManager();
  private maxDataValue: number = 0;
  private radiusScale: ((value: number) => number) | null = null;

  constructor(config: BubbleChartOptions) {
    const mutableConfig = { ...config, type: 'motion' as const };
    super(mutableConfig);
    
    this.motionConfig = {
      repulseStrength: 0.8,
      decay: 0.2,
      collidePadding: 8,
      centerStrength: 0.0, // Disable centering force
      alphaMin: 0.001,
      alphaTarget: 0.01,
      ...(this.config.animation as MotionConfig || {})
    };
    
    this.setupFixedCategoryPositions();
  }

  /**
   * Renders motion bubbles with force simulation using proper D3 enter-update-exit pattern
   */
  protected performRender(): void {
    if (!this.chartData || this.chartData.length === 0) {
      this.clearBubbles();
      return;
    }

    try {
      this.processedData = ChartPipeline.processData(this.chartData, this.config);
      const svgElements = this.svgManager.getElements();
      if (!svgElements) return;

      const { svg, dimensions } = svgElements;

      this.setupResponsiveHandling();
      this.updateMaxDataValue();
      
      const radiusScale = this.createOptimizedRadiusScale(dimensions);
      const { colorScale, theme } = ChartPipeline.createColorScale(this.processedData, this.config);

      ChartPipeline.applyTheme(svgElements, theme);
      
      const motionNodes = this.createOrUpdateNodes(radiusScale);
      
      const bubbleGroups = this.renderBubbleGroups(svg, motionNodes, colorScale);
      
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);

      if (this.config.interactiveFiltering) {
        this.setupInteractiveFiltering(bubbleGroups, motionNodes, dimensions);
      }

      // Update force simulation
      this.updateForceSimulation(motionNodes, bubbleGroups, dimensions);

    } catch (error) {
      console.error('Error rendering motion bubbles:', error);
    }
  }


  private setupResponsiveHandling(): void {
    if (!this.isResponsiveSetup) {
      this.svgManager.makeResponsive({
        onResize: () => this.handleResize(),
        debounceMs: 150
      });
      this.isResponsiveSetup = true;
    }
  }

  private updateMaxDataValue(): void {
    const currentMaxValue = d3.max(this.processedData, (d: any) => d.size) || 0;
    this.maxDataValue = Math.max(this.maxDataValue, currentMaxValue);
  }

  private createOptimizedRadiusScale(dimensions: any): (value: number) => number {
    const currentMinValue = d3.min(this.processedData, (d: any) => d.size) || 0;
    const { minRadius, maxRadius } = this.calculateDensityAwareRadius(dimensions, this.processedData.length);
    
    if (currentMinValue < 0) {
      const maxAbsValue = Math.max(Math.abs(currentMinValue), this.maxDataValue);
      return (value: number) => {
        const absValue = Math.abs(value);
        const normalizedValue = absValue / maxAbsValue;
        return minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedValue);
      };
    } else {
      return d3.scaleSqrt()
        .domain([0, this.maxDataValue])
        .range([minRadius, maxRadius])
        .clamp(true);
    }
  }

  private createOrUpdateNodes(radiusScale: (value: number) => number): any[] {
    const existingNodes = this.simulation ? this.simulation.nodes() : [];
    const existingNodeMap = new Map();
    
    existingNodes.forEach(node => {
      const key = this.getNodeKey(node.data);
      existingNodeMap.set(key, node);
    });
    
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return [];
    
    this.updatePositionsForCanvasSize(svgElements.dimensions);
    
    const existingMotionNodes: any[] = [];
    const newNodes: any[] = [];
    
    this.processedData.forEach((d) => {
      const key = this.getNodeKey(d);
      const existingNode = existingNodeMap.get(key);
      
      if (existingNode) {
        existingNode.data = d;
        existingNode.r = radiusScale(d.size);
        existingMotionNodes.push(existingNode);
      } else {
        const analysisType = (d.data as any).analysisType || 'default';
        const position = this.getInitialPositionForType(analysisType);
        const radius = radiusScale(d.size);
        
        const padding = Math.max(5, radius * 0.1);
        const constrainedPosition = {
          x: Math.max(radius + padding, Math.min(svgElements.dimensions.width - radius - padding, position.x)),
          y: Math.max(radius + padding, Math.min(svgElements.dimensions.height - radius - padding, position.y))
        };
        
        newNodes.push({
          data: d,
          r: radius,
          x: constrainedPosition.x,
          y: constrainedPosition.y,
          vx: 0,
          vy: 0
        });
      }
    });
    
    // Combine existing and new nodes for immediate rendering
    const motionNodes = [...existingMotionNodes, ...newNodes];
    
    return motionNodes;
  }

  private renderBubbleGroups(svg: any, motionNodes: any[], colorScale: any): any {
    // Use ChartPipeline for consistent data binding (fixes stuttering)
    const bubbleGroups = ChartPipeline.renderBubbleGroups(svg, motionNodes, {
      keyFunction: (d: any) => this.getNodeKey(d.data),
      cssClass: 'bubble-chart bubble',
      transform: false // IMPORTANT: Don't let ChartPipeline set transform - force simulation handles it!
    });
    
    // Manually set transform only for new bubbles
    bubbleGroups.each(function(this: SVGGElement, d: any) {
      const elem = d3.select(this);
      if (!elem.attr('transform')) {
        elem.attr('transform', `translate(${d.x},${d.y})`);
      }
    });

    // Add circles using centralized rendering
    ChartPipeline.renderCircles(bubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      colorAccessor: (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'),
      strokeColor: '#fff',
      strokeWidth: 1.5,
      opacity: 0.85,
      initialRadius: (d: any) => d.r,
      initialOpacity: 0.85
    });

    // Add labels using centralized rendering
    ChartPipeline.renderLabels(bubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      labelAccessor: (d: any) => d.data?.label || d.label || '',
      textColor: 'white',
      formatFunction: this.config.format?.text,
      initialOpacity: 1
    });

    return bubbleGroups;
  }

  private startForceSimulation(nodes: any[], _bubbleGroups: any, dimensions: any): void {
    
    const { repulseStrength, decay, collidePadding, alphaMin, alphaTarget } = this.motionConfig;
    
    const getCurrentDimensions = () => {
      const svgElements = this.svgManager.getElements();
      return svgElements ? svgElements.dimensions : dimensions;
    };
    
    
    this.simulation = d3.forceSimulation(nodes)
      .velocityDecay(decay)
      .alpha(0.2)  // Further reduced from 0.3 for even gentler startup
      .alphaMin(alphaMin)
      .alphaTarget(alphaTarget)
      .force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))))
      .force('boundary-x', d3.forceX()
        .strength(1.0)
        .x((d: any) => {
          const dims = getCurrentDimensions();
          const radius = d.r || 0;
          const safeLeft = radius + 20;
          const safeRight = dims.width - radius - 20;
          
          if (d.x < safeLeft) return safeLeft;
          if (d.x > safeRight) return safeRight;
          
          // Just keep within bounds, no center pulling
          return d.x;
        }))
      .force('boundary-y', d3.forceY()
        .strength(1.0)
        .y((d: any) => {
          const dims = getCurrentDimensions();
          const radius = d.r || 0;
          const safeTop = radius + 20;
          const safeBottom = dims.height - radius - 20;
          
          if (d.y < safeTop) return safeTop;
          if (d.y > safeBottom) return safeBottom;
          
          // Just keep within bounds, no center pulling
          return d.y;
        }))
      .on('tick', () => {
        const svgElements = this.svgManager.getElements();
        if (svgElements) {
          const bubbles = svgElements.svg.selectAll('g.bubble');
          bubbles.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
      });
  }


  private stopSimulation(): void {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }

  updateData(data: T[]): void {
    this.chartData = data;
    this.processedData = ChartPipeline.processData(data, this.config);

    // Update nodes without stopping simulation
    if (this.simulation) {
      const newNodes = this.createOrUpdateNodes(this.radiusScale!);
      this.simulation.nodes(newNodes);
      this.updateForceSimulation(newNodes, null, this.svgManager.getElements()!.dimensions);
    }
  }

  /**
   * Override update to prevent full re-render on data updates
   */
  override update(data?: T[]): this {
    if (data) {
      this.data(data);
    }
    
    // If not initialized, do the initial render
    if (!this.isInitialized) {
      super.update();
      return this;
    }
    
    // For subsequent updates, handle incrementally
    if (this.chartData.length > 0) {
      const svgElements = this.svgManager.getElements();
      if (!svgElements) return this;
      
      const { svg, dimensions } = svgElements;
      
      // Update data processing
      this.updateMaxDataValue();
      const radiusScale = this.createOptimizedRadiusScale(dimensions);
      this.radiusScale = radiusScale;
      
      // Create/update nodes preserving existing positions
      const motionNodes = this.createOrUpdateNodes(radiusScale);
      
      // Get color scale
      const { colorScale } = ChartPipeline.createColorScale(this.processedData, this.config);
      
      // Update DOM with D3 data joins (enter/update/exit pattern)
      const bubbleGroups = this.renderBubbleGroups(svg, motionNodes, colorScale);
      
      // Attach events
      ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);
      
      // Update simulation without restarting
      this.updateForceSimulation(motionNodes, bubbleGroups, dimensions);
    } else {
      // No data - clear chart
      this.clearBubbles();
    }
    
    return this;
  }

  resetScaleDomain(): void {
    this.maxDataValue = 0;
  }

  private densityCoverage: number = 0.8; // Default coverage area (80%)

  private calculateDensityAwareRadius(dimensions: { width: number; height: number }, bubbleCount: number): { minRadius: number; maxRadius: number } {
    const containerArea = dimensions.width * dimensions.height;
    const targetArea = containerArea * this.densityCoverage;
    
    const avgBubbleArea = targetArea / Math.max(bubbleCount, 1);
    const avgRadius = Math.sqrt(avgBubbleArea / Math.PI);
    
    let scaleFactor = 1.0;
    if (bubbleCount <= 3) {
      scaleFactor = 1.8;
    } else if (bubbleCount <= 6) {
      scaleFactor = 1.5;
    } else if (bubbleCount <= 12) {
      scaleFactor = 1.2;
    } else if (bubbleCount <= 20) {
      scaleFactor = 1.0;
    } else {
      scaleFactor = 0.8;
    }
    
    const baseMaxRadius = avgRadius * scaleFactor;
    const maxRadius = Math.min(
      baseMaxRadius,
      Math.min(dimensions.width, dimensions.height) / 4
    );
    
    const minRadius = Math.max(8, maxRadius * 0.15);
    
    return {
      minRadius: Math.round(minRadius),
      maxRadius: Math.round(Math.max(maxRadius, minRadius + 5))
    };
  }

  updateRadius(nodeId: string, newRadius: number): void {
    if (!this.simulation) return;

    const nodes = this.simulation.nodes();
    const targetNode = nodes.find((n: any) => {
      const nodeId_actual = n.data?.id || n.data?.label || JSON.stringify(n.data);
      return nodeId_actual === nodeId;
    });

    if (!targetNode) return;

    targetNode.r = newRadius;

    const { collidePadding, repulseStrength } = this.motionConfig;
    this.simulation.force('collision', d3.forceCollide()
      .radius((d: any) => d.r + collidePadding)
      .strength(Math.max(0, Math.min(1, repulseStrength))));

    this.simulation.restart();

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
   * Set density coverage - controls how much of the container area bubbles target to fill
   * @param densityOrCoverage - Either a preset string ('sparse', 'balanced', 'dense', 'compact') or numeric value between 0.1 and 1.0
   *   - 'sparse' or 0.3 = sparse (30% coverage)
   *   - 'balanced' or 0.6 = balanced (60% coverage) 
   *   - 'dense' or 0.8 = dense (80% coverage)
   *   - 'compact' or 1.0 = maximum density (100% coverage)
   */
  setDensity(densityOrCoverage: number | 'sparse' | 'balanced' | 'dense' | 'compact'): void {
    let coverage: number;
    
    // Handle string presets for backward compatibility
    if (typeof densityOrCoverage === 'string') {
      const presetMap: Record<string, number> = {
        'sparse': 0.3,
        'balanced': 0.6,
        'dense': 0.8,
        'compact': 1.0
      };
      coverage = presetMap[densityOrCoverage] || 0.6;
    } else {
      coverage = densityOrCoverage;
    }
    // Clamp coverage between 0.1 and 1.0
    this.densityCoverage = Math.max(0.1, Math.min(1.0, coverage));
    
    // Recalculate bubble sizes with new density
    const svgElements = this.svgManager.getElements();
    if (!svgElements || !this.processedData) return;
    
    const { minRadius, maxRadius } = this.calculateDensityAwareRadius(
      svgElements.dimensions, 
      this.processedData.length
    );
    
    // Update radius scale
    this.radiusScale = d3.scaleSqrt()
      .domain([0, this.maxDataValue])
      .range([minRadius, maxRadius])
      .clamp(true);
    
    // Update existing bubble sizes if simulation is running
    if (this.simulation) {
      const nodes = this.simulation.nodes();
      nodes.forEach(node => {
        const value = node.data?.size || 0;
        node.r = this.radiusScale!(value);
      });
      
      // Update collision force with new radii
      const { collidePadding, repulseStrength } = this.motionConfig;
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))));
      
      // Update visual bubbles
      svgElements.svg.selectAll('g.bubble circle')
        .transition()
        .duration(300)
        .attr('r', (d: any) => d.r);
      
      // Gently reheat simulation if it's settled
      if (this.simulation.alpha() < 0.1) {
        this.simulation.alpha(0.2);
      }
    }
  }

  getMotionConfig(): Required<MotionConfig> {
    return { ...this.motionConfig };
  }

  setMotionConfig(newConfig: Partial<MotionConfig>): this {
    // Debug log: show merged motion config after applying new settings
    const mergedConfig = { ...this.motionConfig, ...newConfig } as Required<MotionConfig>;
    console.log('🛠️ [MotionBubble] setMotionConfig applied:', mergedConfig);
    this.motionConfig = { ...this.motionConfig, ...newConfig };
    
    if (this.simulation) {
      const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget } = this.motionConfig;
      
      this.simulation
        .velocityDecay(decay)
        .alphaMin(alphaMin)
        .alphaTarget(alphaTarget);
        
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

  triggerSpatialFilter(filterField?: string): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements || !this.simulation) return;

    const nodes = this.simulation.nodes();
    if (!nodes || nodes.length === 0) return;

    if (!filterField) {
      this.resetFilter(nodes, svgElements.dimensions);
      return;
    }

    this.config.colour = filterField;
    
    const sampleNode = nodes[0];
    const originalData = sampleNode.data.data || sampleNode.data;
    const filterValue = originalData[filterField];
    
    if (filterValue) {
      this.applyFilter(filterValue, nodes, svgElements.dimensions);
    }
  }

  private setupInteractiveFiltering(bubbleGroups: any, nodes: any[], dimensions: any): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    bubbleGroups.on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      const filterField = typeof this.config.colour === 'string' ? this.config.colour : 'group';
      const originalData = d.data.data || d.data;
      const filterValue = originalData[filterField];
      
      if (filterValue) {
        this.applyFilter(filterValue, nodes, dimensions);
      }
    });

    svgElements.svg.on('click', (event: MouseEvent) => {
      if (event.target === svgElements.svg.node()) {
        this.resetFilter(nodes, dimensions);
      }
    });
  }

  private applyFilter(filterValue: string, nodes: any[], dimensions: any): void {
    if (this.isFiltered && this.currentFilter === filterValue) {
      this.resetFilter(nodes, dimensions);
      return;
    }

    this.isFiltered = true;
    this.currentFilter = filterValue;
    
    this.filterGroups.clear();
    const filterField = typeof this.config.colour === 'string' ? this.config.colour : 'group';
    
    nodes.forEach(node => {
      const originalData = node.data.data || node.data;
      const groupValue = originalData[filterField] || 'Other';
      if (!this.filterGroups.has(groupValue)) {
        this.filterGroups.set(groupValue, []);
      }
      this.filterGroups.get(groupValue)!.push(node);
    });

    const groups = Array.from(this.filterGroups.keys());
    const angleStep = (2 * Math.PI) / groups.length;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    // Much larger cluster radius for better separation
    const clusterRadius = Math.min(dimensions.width, dimensions.height) * 0.45;

    if (this.simulation) {
      // Remove all conflicting forces
      this.simulation.force('category-x', null);
      this.simulation.force('category-y', null);
      this.simulation.force('collision', null);
      this.simulation.force('boundary-x', null);  // Remove boundary forces that pull to center
      this.simulation.force('boundary-y', null);
      
      const targetPositions = new Map();
      
      groups.forEach((group, i) => {
        const angle = i * angleStep;
        const targetX = centerX + Math.cos(angle) * clusterRadius;
        const targetY = centerY + Math.sin(angle) * clusterRadius;
        targetPositions.set(group, { x: targetX, y: targetY });
      });
      
      // Stronger grouping forces to overcome inertia
      this.simulation.force('filter-x', d3.forceX()
        .strength(0.9)  // Much stronger
        .x((d: any) => {
          const originalData = d.data.data || d.data;
          const nodeGroup = originalData[filterField] || 'Other';
          const target = targetPositions.get(nodeGroup);
          return target ? target.x : centerX;
        }));
        
      this.simulation.force('filter-y', d3.forceY()
        .strength(0.9)  // Much stronger
        .y((d: any) => {
          const originalData = d.data.data || d.data;
          const nodeGroup = originalData[filterField] || 'Other';
          const target = targetPositions.get(nodeGroup);
          return target ? target.y : centerY;
        }));
      
      // Stronger collision to prevent overlap in clusters
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + 3)  // More padding
        .strength(0.9));
      
      // Use consistent decay (same as default)
      this.simulation.velocityDecay(this.motionConfig.decay);
    }

    this.renderFilterLabels(groups, dimensions, centerX, centerY, clusterRadius, angleStep);
  }

  private resetFilter(_nodes: any[], dimensions: any): void {
    this.isFiltered = false;
    this.currentFilter = null;
    
    if (this.simulation) {
      // Clean up filter forces
      const groups = Array.from(this.filterGroups.keys());
      groups.forEach(group => {
        this.simulation!.force(`filter-x-${group}`, null);
        this.simulation!.force(`filter-y-${group}`, null);
      });
      
      this.filterGroups.clear();
      this.simulation.force('filter-x', null);
      this.simulation.force('filter-y', null);
      
      // Restore all original forces for consistent physics
      const { collidePadding, repulseStrength } = this.motionConfig;
      
      // Restore category and boundary forces (updateCategoryForces handles both)
      this.updateCategoryForces(dimensions);
      
      // Restore collision force  
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))));
      
      // Restore consistent decay
      this.simulation.velocityDecay(this.motionConfig.decay);
    }

    this.removeFilterLabels();
  }

  private renderFilterLabels(groups: string[], _dimensions: any, centerX: number, centerY: number, radius: number, angleStep: number): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    this.removeFilterLabels();

    this.filterLabels = svgElements.svg.append('g')
      .attr('class', 'filter-labels');

    groups.forEach((group, i) => {
      const angle = i * angleStep;
      const labelX = centerX + Math.cos(angle) * (radius + 50);
      const labelY = centerY + Math.sin(angle) * (radius + 50);
      const count = this.filterGroups.get(group)?.length || 0;

      const labelGroup = this.filterLabels!.append('g')
        .attr('transform', `translate(${labelX}, ${labelY})`);

      const text = labelGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333');

      text.append('tspan').text(group);
      
      text.append('tspan')
        .attr('x', 0)
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('font-weight', 'normal')
        .text(`(${count})`);
    });
  }

  private removeFilterLabels(): void {
    if (this.filterLabels) {
      this.filterLabels.remove();
      this.filterLabels = null;
    }
  }

  private clearBubbles(): void {
    const svgElements = this.svgManager.getElements();
    if (svgElements) {
      svgElements.svg.selectAll('g.bubble').remove();
    }
    this.stopSimulation();
  }

  private updateForceSimulation(nodes: any[], bubbleGroups: any, dimensions: any): void {
    if (this.simulation) {
      // Position new nodes near their category positions
      const existingNodes = this.simulation.nodes();
      const existingIds = new Set(existingNodes.map(n => this.getNodeKey(n.data)));
      
      nodes.forEach(node => {
        const nodeKey = this.getNodeKey(node.data);
        if (!existingIds.has(nodeKey)) {
          // New node - position it and initialize velocities
          const analysisType = this.getAnalysisType(node.data);
          const categoryPos = this.positionManager.getAbsolutePosition(analysisType, dimensions);
          const position = this.findCollisionFreePosition(node, existingNodes, categoryPos, dimensions);
          
          node.x = position.x;
          node.y = position.y;
          node.vx = 0;
          node.vy = 0;
        }
      });
      
      // Update simulation nodes and gently restart
      this.simulation.nodes(nodes);
      this.updateCollisionForce();
      
      // Gentle restart for new nodes
      if (this.simulation.alpha() < 0.1) {
        this.simulation.alpha(0.15);
      }
    } else {
      this.startForceSimulation(nodes, bubbleGroups, dimensions);
    }
  }

  private getInitialPositionForType(analysisType: string): {x: number, y: number} {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return { x: 0, y: 0 };
    
    const position = this.positionManager.getAbsolutePosition(analysisType, svgElements.dimensions);
    return { x: position.x, y: position.y };
  }

  private setupFixedCategoryPositions(): void {
    this.positionManager.setNormalizedPosition('duration', 0.5, 0.3);
    this.positionManager.setNormalizedPosition('viewCount', 0.3, 0.7);
    this.positionManager.setNormalizedPosition('verification', 0.7, 0.7);
  }

  /**
   * Find a collision-free position near the target using spiral search
   */
  private findCollisionFreePosition(
    node: any,
    existingNodes: any[],
    categoryPos: { x: number; y: number },
    dimensions: { width: number; height: number }
  ): { x: number; y: number } {
    // Calculate node radius with padding for clearance
    const nodeRadius = this.getNodeRadius(node.data);
    const collidePadding = this.motionConfig.collidePadding || 2;
    const clearance = nodeRadius + collidePadding + 10; // Extra 10px safety margin
    
    // Start at the category position (already in absolute pixels)
    let x = categoryPos.x;
    let y = categoryPos.y;
    
    // If no existing nodes, just return the category position
    if (existingNodes.length === 0) {
      return { x, y };
    }
    
    // Check if the initial position is free
    if (this.isPositionFree(x, y, clearance, existingNodes)) {
      return { x, y };
    }
    
    // Spiral search for a free position
    const maxAttempts = 100;
    const stepSize = clearance * 0.5;
    let angle = 0;
    let radius = stepSize;
    
    for (let i = 0; i < maxAttempts; i++) {
      // Calculate position on spiral
      const testX = x + radius * Math.cos(angle);
      const testY = y + radius * Math.sin(angle);
      
      // Check if position is within bounds
      if (
        testX >= clearance &&
        testX <= dimensions.width - clearance &&
        testY >= clearance &&
        testY <= dimensions.height - clearance
      ) {
        // Check if position is free from collisions
        if (this.isPositionFree(testX, testY, clearance, existingNodes)) {
          
          return { x: testX, y: testY };
        }
      }
      
      // Increase angle and radius for next spiral step
      angle += Math.PI * 0.5;
      radius += stepSize * 0.5;
    }
    
    // If we couldn't find a free position, return a position near the edge
    
    return {
      x: Math.max(clearance, Math.min(dimensions.width - clearance, x)),
      y: Math.max(clearance, Math.min(dimensions.height - clearance, y))
    };
  }

  /**
   * Check if a position has sufficient clearance from existing nodes
   */
  private isPositionFree(x: number, y: number, clearance: number, existingNodes: any[]): boolean {
    for (const existing of existingNodes) {
      if (existing.x === undefined || existing.y === undefined) continue;
      
      const existingRadius = this.getNodeRadius(existing.data);
      const distance = Math.sqrt(Math.pow(existing.x - x, 2) + Math.pow(existing.y - y, 2));
      
      if (distance < clearance + existingRadius) {
        return false;
      }
    }
    return true;
  }

  private updatePositionsForCanvasSize(dimensions: any): void {
    // Let the positionManager handle the coordinate updates
    this.positionManager.updateAbsolutePositions(dimensions);
    this.updateCategoryForces(dimensions);
  }

  private updateCategoryForces(dimensions: any): void {
    if (!this.simulation) return;
    
    // Only update boundary forces since category forces are disabled
    const boundaryXForce = this.simulation.force('boundary-x') as d3.ForceX<any>;
    const boundaryYForce = this.simulation.force('boundary-y') as d3.ForceY<any>;
    
    if (boundaryXForce) {
      boundaryXForce.strength(1.0)
        .x((d: any) => {
          const radius = d.r || 0;
          const safeLeft = radius + 20;
          const safeRight = dimensions.width - radius - 20;
          
          if (d.x < safeLeft) return safeLeft;
          if (d.x > safeRight) return safeRight;
          
          // Just keep within bounds, no center pulling
          return d.x;
        });
    }
    
    if (boundaryYForce) {
      boundaryYForce.strength(1.0)
        .y((d: any) => {
          const radius = d.r || 0;
          const safeTop = radius + 20;
          const safeBottom = dimensions.height - radius - 20;
          
          if (d.y < safeTop) return safeTop;
          if (d.y > safeBottom) return safeBottom;
          
          // Just keep within bounds, no center pulling
          return d.y;
        });
    }
  }

    private calculateOptimalDensity(nodeCount: number, area: number): number {
    const nodePerArea = nodeCount / area;
    const scaledDensity = nodePerArea * 1000000;
    
    if (scaledDensity < 0.5) return 0.3; // sparse
    else if (scaledDensity < 1.5) return 0.6; // balanced
    else if (scaledDensity < 3.0) return 0.8; // dense
    else return 1.0; // compact
  }

  private handleResize(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements || !this.simulation) return;
    
    const { dimensions } = svgElements;
    const nodes = this.simulation.nodes();
    const nodeCount = nodes.length;
    
    if (nodeCount === 0) return;

    const area = dimensions.width * dimensions.height;
    const optimalDensity = this.calculateOptimalDensity(nodeCount, area);
    
    const aspectRatio = dimensions.width / dimensions.height;
    const isMobile = dimensions.width < 768;
    const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
    const isPortrait = aspectRatio < 1;
    
    let adjustedDensity = optimalDensity;
    
    if (isMobile) {
      if (adjustedDensity === 1.0) adjustedDensity = 0.8; // compact -> dense
      if (adjustedDensity === 0.8) adjustedDensity = 0.6; // dense -> balanced
    } else if (isTablet && isPortrait) {
      if (adjustedDensity === 1.0) adjustedDensity = 0.8; // compact -> dense
    }
    
    // Only change density when simulation is settled to avoid disrupting existing motion
    const currentAlpha = this.simulation?.alpha() || 0;
    if (currentAlpha < 0.1 || !this.simulation) {
      this.setDensity(adjustedDensity);
    }
    
    this.updatePositionsForCanvasSize(dimensions);
    this.updateCategoryForces(dimensions);
    
    const { minRadius, maxRadius } = this.calculateDensityAwareRadius(dimensions, nodeCount);
    
    let radiusScale: (value: number) => number;
    const baseScale = d3.scaleSqrt()
      .domain([0, this.maxDataValue])
      .range([minRadius, maxRadius])
      .clamp(true);
    
    if (isMobile) {
      radiusScale = (value: number) => Math.max(baseScale(value) * 1.1, 12);
    } else if (isTablet) {
      radiusScale = (value: number) => Math.max(baseScale(value) * 1.05, 10);
    } else {
      radiusScale = baseScale;
    }
    
    const currentMaxValue = d3.max(nodes, (d: any) => d.data?.size || d.size) || 0;
    this.maxDataValue = Math.max(this.maxDataValue, currentMaxValue);
    
    nodes.forEach(node => {
      const newRadius = radiusScale(node.data?.size || node.size || 0);
      node.r = newRadius;
    });
    
    const animationDuration = isMobile ? 300 : 500;
    svgElements.svg.selectAll('g.bubble circle')
      .transition()
      .duration(animationDuration)
      .attr('r', (d: any) => d.r);
    
    const { collidePadding, repulseStrength } = this.motionConfig;
    this.simulation.force('collision', d3.forceCollide()
      .radius((d: any) => d.r + collidePadding)
      .strength(Math.max(0, Math.min(1, repulseStrength))));
    
    this.simulation.restart();
  }

  public triggerResize(): void {
    this.handleResize();
  }

  public debugBubblePositions(): void {
    if (!this.simulation) return;

    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const nodes = this.simulation.nodes();
    const { width, height } = svgElements.dimensions;
    let outOfBoundsCount = 0;

    nodes.forEach((node) => {
      const radius = node.r || 0;
      const leftEdge = node.x - radius;
      const rightEdge = node.x + radius;
      const topEdge = node.y - radius;
      const bottomEdge = node.y + radius;

      const isOutOfBounds = leftEdge < 0 || rightEdge > width || topEdge < 0 || bottomEdge > height;
      
      if (isOutOfBounds) {
        outOfBoundsCount++;
      }
    });
  }

  /**
   * Add or remove filter indicator dots around a bubble
   * @param categoryName - The category name (label) to show/hide indicators for
   * @param showIndicators - Whether to show or hide the indicators
   */
  public setFilterIndicators(categoryName: string, showIndicators: boolean): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const { svg } = svgElements;
    
    // Find the bubble group for this category - match by label (which is what actually exists)
    const bubbleGroup = svg.selectAll('g.bubble-chart.bubble')
      .filter((d: any) => d.data?.label === categoryName);
    
    if (bubbleGroup.empty()) return;

    // Use a safe class name by replacing spaces with dashes and removing special characters
    const safeClassName = categoryName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const indicatorGroupId = `indicator-${safeClassName}`;
    
    if (showIndicators) {
      // Remove existing indicators first
      bubbleGroup.select(`.${indicatorGroupId}`).remove();
      
      // Get bubble data and radius
      const bubbleData = bubbleGroup.datum();
      const bubbleRadius = bubbleData.r;
      
      // Create indicator group
      const indicatorGroup = bubbleGroup
        .append('g')
        .attr('class', indicatorGroupId)
        .attr('opacity', 0);
      
      // Create dotted circle outline around the bubble
      const outlineRadius = bubbleRadius + 8; // Position outline just outside the main bubble
      
      indicatorGroup
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', outlineRadius)
        .style('fill', 'none')
        .style('stroke', '#667eea')
        .style('stroke-width', 3)
        .style('stroke-dasharray', '8,4') // Dotted line pattern: 8px dash, 4px gap
        .style('opacity', 0.9);
      
      // Animate indicators in
      indicatorGroup
        .transition()
        .duration(300)
        .attr('opacity', 1);
        
    } else {
      // Remove indicators with animation
      const indicatorGroup = bubbleGroup.select(`.${indicatorGroupId}`);
      if (!indicatorGroup.empty()) {
        indicatorGroup
          .transition()
          .duration(200)
          .attr('opacity', 0)
          .remove();
      }
    }
  }

  /**
   * Clear all filter indicators
   */
  public clearAllFilterIndicators(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const { svg } = svgElements;
    
    // Remove all indicator groups
    svg.selectAll('g.bubble-chart.bubble g[class*="indicator-"]')
      .transition()
      .duration(200)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Add event handler for a specific bubble by ID
   * @param bubbleId The ID of the bubble to attach the handler to
   * @param handler The event handler function
   * @param eventType The event type (default: 'click')
   */
  public onBubble(bubbleId: string, handler: (event: Event, data: any) => void, eventType: string = 'click'): this {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return this;

    const { svg } = svgElements;
    
    // Find the bubble group for this ID
    const bubbleGroup = svg.selectAll('g.bubble-chart.bubble')
      .filter((d: any) => {
        // Try multiple paths to find the ID
        const id = d.data?.id || d.data?.data?.id || d.id;
        return id === bubbleId;
      });
    
    if (!bubbleGroup.empty()) {
      // Attach event handler
      bubbleGroup.on(eventType, function(this: SVGGElement, event: Event) {
        const data = d3.select(this).datum();
        handler(event, data);
      });
      
      // Event handler attached
    } else {
      // Could not find bubble
      
      // Set up a MutationObserver to watch for the bubble to be added to the DOM
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if our bubble has been added
            const bubbleGroup = svg.selectAll('g.bubble-chart.bubble')
              .filter((d: any) => {
                const id = d.data?.id || d.data?.data?.id || d.id;
                return id === bubbleId;
              });
            
            if (!bubbleGroup.empty()) {
              // Attach event handler
              bubbleGroup.on(eventType, function(this: SVGGElement, event: Event) {
                const data = d3.select(this).datum();
                handler(event, data);
              });
              
              // Event handler attached via observer
              
              // Stop observing
              observer.disconnect();
            }
          }
        });
      });
      
      // Start observing
      const chartContainer = svg.node()?.parentNode;
      if (chartContainer) {
        observer.observe(chartContainer, { 
          childList: true,
          subtree: true
        });
        
        // Watching for bubble to be added to DOM
      }
    }
    
    return this;
  }

  override destroy(): void {
    this.stopSimulation();
    this.removeFilterLabels();
    this.isResponsiveSetup = false;
    super.destroy();
  }

  /**
   * Get the radius of a node based on its data
   */
  private getNodeRadius(nodeData: any): number {
    if (!nodeData) return 30; // Default radius
    
    // If we have a radiusScale, use it
    if (this.radiusScale) {
      const value = this.getRadiusValue(nodeData);
      return this.radiusScale(value);
    }
    
    // If the node already has a radius, use it
    if (nodeData.r) return nodeData.r;
    
    // Default radius based on count if available
    return nodeData.count ? Math.sqrt(nodeData.count) * 5 + 10 : 30;
  }

  /**
   * Get the value to use for radius calculation
   */
  private getRadiusValue(data: any): number {
    if (!data) return 1;
    
    // Use count property if available
    if (data.count !== undefined) return data.count;
    
    // Use size property if available
    if (data.size !== undefined) return data.size;
    
    // Use value property if available
    if (data.value !== undefined) return data.value;
    
    return 1;
  }

  /**
   * Get a unique key for a node based on its data
   */
  private getNodeKey(data: any): string {
    return data?.id || data?.label || JSON.stringify(data);
  }

  /**
   * Extract analysis type from node data
   */
  private getAnalysisType(data: any): string {
    const rawData = data?.data || data;
    return rawData?.analysisType || data?.analysisType || 'default';
  }

  /**
   * Update collision force with current configuration
   */
  private updateCollisionForce(): void {
    if (!this.simulation) return;
    
    const { collidePadding, repulseStrength } = this.motionConfig;
    const collisionForce = this.simulation.force('collision') as d3.ForceCollide<any>;
    
    if (collisionForce) {
      collisionForce
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength)));
    }
  }


}
