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
  private isResponsiveSetup: boolean = false;

  private isFiltered: boolean = false;
  private currentFilter: string | null = null;
  private filterGroups: Map<string, any[]> = new Map();
  private filterLabels: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private categoryTypePositions: Map<string, {x: number, y: number}> = new Map();
  private normalizedPositions: Map<string, {x: number, y: number}> = new Map();
  private positionsInitialized: boolean = false;
  private lastCanvasWidth: number = 0;
  private lastCanvasHeight: number = 0;
  private maxDataValue: number = 0;

  constructor(config: BubbleChartOptions) {
    const mutableConfig = { ...config, type: 'motion' as const };
    super(mutableConfig);
    
    this.motionConfig = {
      repulseStrength: 0.8,
      decay: 0.2,
      collidePadding: 8,
      centerStrength: 0.05,
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

      this.updateForceSimulation(motionNodes, bubbleGroups, dimensions);

    } catch (error) {
      throw error;
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
      const key = node.data.id || node.data.label || JSON.stringify(node.data);
      existingNodeMap.set(key, node);
    });
    
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return [];
    
    this.updatePositionsForCanvasSize(svgElements.dimensions);
    
    const existingMotionNodes: any[] = [];
    const newNodes: any[] = [];
    
    this.processedData.forEach((d) => {
      const key = d.id || d.label || JSON.stringify(d);
      const existingNode = existingNodeMap.get(key);
      
      if (existingNode) {
        existingNode.data = d;
        existingNode.r = radiusScale(d.size);
        existingMotionNodes.push(existingNode);
      } else {
        const analysisType = d.analysisType || 'default';
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
    return svg.selectAll('g.bubble')
      .data(motionNodes, (d: any) => d.data.id || d.data.label || JSON.stringify(d.data))
      .join(
        (enter: any) => {
          const enterGroups = enter
            .append('g')
            .attr('class', 'bubble-chart bubble')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

          enterGroups.selectAll('circle')
            .data((d: any) => [d])
            .join('circle')
            .attr('r', (d: any) => d.r)
            .style('opacity', 0.85)
            .attr('fill', (d: any) => d.data.colorValue ? colorScale(d.data.colorValue) : (this.config.defaultColor || '#1f77b4'))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

          ChartPipeline.renderLabels(enterGroups, {
            radiusAccessor: (d: any) => d.r,
            labelAccessor: (d: any) => d.data?.label || d.label || '',
            textColor: 'white',
            formatFunction: this.config.format?.text,
            initialOpacity: 1
          });

          enterGroups.style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 1);

          return enterGroups;
        },
        (update: any) => {
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
        (exit: any) => {
          exit.transition()
            .duration(300)
            .style('opacity', 0)
            .remove();
          return exit;
        }
      );
  }

  private startForceSimulation(nodes: any[], _bubbleGroups: any, dimensions: any): void {
    const { repulseStrength, decay, collidePadding, centerStrength, alphaMin, alphaTarget } = this.motionConfig;
    
    const getCurrentDimensions = () => {
      const svgElements = this.svgManager.getElements();
      return svgElements ? svgElements.dimensions : dimensions;
    };
    
    this.simulation = d3.forceSimulation(nodes)
      .velocityDecay(decay)
      .alpha(0.6)
      .alphaMin(alphaMin)
      .alphaTarget(alphaTarget)
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
      .force('boundary-x', d3.forceX()
        .strength(1.0)
        .x((d: any) => {
          const dims = getCurrentDimensions();
          const radius = d.r || 0;
          const safeLeft = radius + 20;
          const safeRight = dims.width - radius - 20;
          
          if (d.x < safeLeft) return safeLeft;
          if (d.x > safeRight) return safeRight;
          
          const center = dims.width / 2;
          const pullFactor = 0.02;
          return d.x + (center - d.x) * pullFactor;
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
          
          const center = dims.height / 2;
          const pullFactor = 0.02;
          return d.y + (center - d.y) * pullFactor;
        }))
      .on('tick', () => {
        const svgElements = this.svgManager.getElements();
        if (svgElements) {
          svgElements.svg.selectAll('g.bubble')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
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
    this.stopSimulation();
    this.update();
  }

  resetScaleDomain(): void {
    this.maxDataValue = 0;
  }

  private calculateDensityAwareRadius(dimensions: { width: number; height: number }, bubbleCount: number): { minRadius: number; maxRadius: number } {
    const containerArea = dimensions.width * dimensions.height;
    const targetCoverage = 0.8;
    const targetArea = containerArea * targetCoverage;
    
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

  setDensity(preset: 'sparse' | 'balanced' | 'dense' | 'compact'): void {
    if (!this.simulation) return;

    const densityConfigs = {
      sparse: { repulseStrength: 1.0, centerStrength: 0.02, collidePadding: 12 },
      balanced: { repulseStrength: 0.8, centerStrength: 0.05, collidePadding: 8 },
      dense: { repulseStrength: 0.6, centerStrength: 0.08, collidePadding: 4 },
      compact: { repulseStrength: 0.4, centerStrength: 0.12, collidePadding: 2 }
    };

    const config = densityConfigs[preset];
    this.motionConfig = { ...this.motionConfig, ...config };

    const collisionForce = this.simulation.force('collision') as d3.ForceCollide<any>;
    const categoryXForce = this.simulation.force('category-x') as d3.ForceX<any>;
    const categoryYForce = this.simulation.force('category-y') as d3.ForceY<any>;
    
    if (collisionForce) {
      collisionForce.radius((d: any) => d.r + config.collidePadding);
      collisionForce.strength(Math.max(0, Math.min(1, config.repulseStrength)));
    }
    
    if (categoryXForce) categoryXForce.strength(config.centerStrength);
    if (categoryYForce) categoryYForce.strength(config.centerStrength);

    this.simulation.restart();
  }

  getMotionConfig(): Required<MotionConfig> {
    return { ...this.motionConfig };
  }

  setMotionConfig(newConfig: Partial<MotionConfig>): this {
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
      nodes.forEach(node => {
        if (node.vx === undefined) {
          node.vx = 0;
          node.vy = 0;
        }
      });
      
      this.simulation.nodes(nodes);
      
      this.simulation.on('tick', () => {
        const svgElements = this.svgManager.getElements();
        if (svgElements) {
          svgElements.svg.selectAll('g.bubble')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        }
      });
      
      const { collidePadding, repulseStrength } = this.motionConfig;
      this.simulation.force('collision', d3.forceCollide()
        .radius((d: any) => d.r + collidePadding)
        .strength(Math.max(0, Math.min(1, repulseStrength))));
    } else {
      this.startForceSimulation(nodes, bubbleGroups, dimensions);
    }
  }

  private getInitialPositionForType(analysisType: string): {x: number, y: number} {
    const position = this.categoryTypePositions.get(analysisType);
    
    if (!position) {
      const svgElements = this.svgManager.getElements();
      if (svgElements) {
        const centerX = svgElements.dimensions.width / 2;
        const centerY = svgElements.dimensions.height / 2;
        return { x: centerX, y: centerY };
      }
      return { x: 0, y: 0 };
    }
    
    return position;
  }

  private setupFixedCategoryPositions(): void {
    this.normalizedPositions.set('duration', { x: 0.5, y: 0.3 });
    this.normalizedPositions.set('viewCount', { x: 0.3, y: 0.7 });
    this.normalizedPositions.set('verification', { x: 0.7, y: 0.7 });
  }

  private updatePositionsForCanvasSize(dimensions: any): void {
    const sizeChanged = this.lastCanvasWidth !== dimensions.width || this.lastCanvasHeight !== dimensions.height;
    
    if (!sizeChanged && this.positionsInitialized) return;
    
    this.lastCanvasWidth = dimensions.width;
    this.lastCanvasHeight = dimensions.height;
    
    this.normalizedPositions.forEach((normalizedPos, type) => {
      const absolutePos = {
        x: normalizedPos.x * dimensions.width,
        y: normalizedPos.y * dimensions.height
      };
      this.categoryTypePositions.set(type, absolutePos);
    });
    
    this.positionsInitialized = true;
    this.updateCategoryForces(dimensions);
  }

  private updateCategoryForces(dimensions: any): void {
    if (!this.simulation) return;

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

    this.simulation.force('boundary-x', d3.forceX()
      .strength(1.0)
      .x((d: any) => {
        const radius = d.r || 0;
        const safeLeft = radius + 20;
        const safeRight = dimensions.width - radius - 20;
        
        if (d.x < safeLeft) return safeLeft;
        if (d.x > safeRight) return safeRight;
        
        const center = dimensions.width / 2;
        const pullFactor = 0.02;
        return d.x + (center - d.x) * pullFactor;
      }));
    
    this.simulation.force('boundary-y', d3.forceY()
      .strength(1.0)
      .y((d: any) => {
        const radius = d.r || 0;
        const safeTop = radius + 20;
        const safeBottom = dimensions.height - radius - 20;
        
        if (d.y < safeTop) return safeTop;
        if (d.y > safeBottom) return safeBottom;
        
        const center = dimensions.height / 2;
        const pullFactor = 0.02;
        return d.y + (center - d.y) * pullFactor;
      }));
              }

    private calculateOptimalDensity(nodeCount: number, area: number): 'sparse' | 'balanced' | 'dense' | 'compact' {
    const nodePerArea = nodeCount / area;
    const scaledDensity = nodePerArea * 1000000;
    
    if (scaledDensity < 0.5) return 'sparse';
    else if (scaledDensity < 1.5) return 'balanced';
    else if (scaledDensity < 3.0) return 'dense';
    else return 'compact';
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
      if (adjustedDensity === 'compact') adjustedDensity = 'dense';
      if (adjustedDensity === 'dense') adjustedDensity = 'balanced';
    } else if (isTablet && isPortrait) {
      if (adjustedDensity === 'compact') adjustedDensity = 'dense';
    }
    
    this.setDensity(adjustedDensity);
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

  override destroy(): void {
    this.stopSimulation();
    this.removeFilterLabels();
    this.isResponsiveSetup = false;
    super.destroy();
  }
}
