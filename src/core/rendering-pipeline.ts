/**
 * Rendering Pipeline System
 * Centralized handling of bubble creation, text rendering, and layout positioning
 * Eliminates duplication across all chart builders
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig } from '../types/config.js';
import type { ProcessedDataPoint } from './data-processor.js';
// import type { SVGElements } from './svg-manager.js';

export interface RenderingContext {
  svg: any;
  width: number;
  height: number;
  config: BubbleChartConfig;
}

export interface BubbleElements {
  bubbleGroups: any;
  circles: any;
  labels: any;
}

export interface LayoutNode {
  x: number;
  y: number;
  r: number;
  data: any;
}

/**
 * Rendering pipeline for consistent bubble visualization across all chart types
 */
export class RenderingPipeline<T extends BubbleChartData = BubbleChartData> {
  constructor(
    private context: RenderingContext
  ) {
    // RenderingPipeline initialized with context
  }

  /**
   * Create basic bubble pack layout
   * @param data - Processed data points
   * @returns Layout nodes with positions and sizes
   */
  createBubblePackLayout(data: ProcessedDataPoint<T>[]): LayoutNode[] {
    const { width, height, config } = this.context;

    // Create pack layout
    const pack = d3.pack()
      .size([width, height])
      .padding(config.bubble?.padding || 5);

    // Create hierarchy for pack layout
    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.size || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Apply pack layout
    const nodes = pack(root).descendants().slice(1); // Skip root node

    return nodes.map(node => ({
      x: node.x,
      y: node.y,
      r: node.r,
      data: node.data
    }));
  }

  /**
   * Create hierarchical pack layout for tree structures
   * @param data - Hierarchical data
   * @returns Layout nodes with nested structure
   */
  createHierarchicalLayout(data: any): LayoutNode[] {
    const { width, height, config } = this.context;

    const pack = d3.pack()
      .size([width, height])
      .padding(config.tree?.minRadius || 5);

    const root = d3.hierarchy(data)
      .sum((d: any) => d.size || d.amount || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const nodes = pack(root).descendants();

    return nodes.map(node => ({
      x: node.x,
      y: node.y,
      r: node.r,
      data: node.data
    }));
  }

  /**
   * Create force-directed layout for motion bubbles
   * @param data - Processed data points
   * @returns Initial layout nodes for simulation
   */
  createForceLayout(data: ProcessedDataPoint<T>[]): LayoutNode[] {
    const { width, height } = this.context;

    // Create initial packed layout for sizes
    const initialLayout = this.createBubblePackLayout(data);

    // Convert to force simulation format
    return initialLayout.map(node => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: node.r,
      data: node.data
    }));
  }

  /**
   * Create bubble elements with consistent styling
   * @param layoutNodes - Layout nodes with positions
   * @param data - Original processed data
   * @returns Bubble elements object
   */
  createBubbleElements(
    layoutNodes: LayoutNode[], 
    data: ProcessedDataPoint<T>[]
  ): BubbleElements {
    const { svg, config } = this.context;

    // Create bubble groups
    const bubbleGroups = svg.selectAll('.bubble')
      .data(layoutNodes)
      .join('g')
      .attr('class', 'bubble')
      .attr('transform', (d: LayoutNode) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer');

    // Create circles
    const circles = bubbleGroups
      .append('circle')
      .attr('r', (d: LayoutNode) => d.r)
      .style('fill', (d: LayoutNode, i: number) => this.getCircleColor(d, i))
      .style('stroke', config.defaultColor || '#fff')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    // Create labels
    const labels = this.createLabels(bubbleGroups, layoutNodes, data);

    return {
      bubbleGroups,
      circles,
      labels
    };
  }

  /**
   * Create text labels for bubbles
   * @param bubbleGroups - D3 selection of bubble groups
   * @param layoutNodes - Layout nodes
   * @param data - Original processed data
   * @returns Text selection
   */
  createLabels(
    bubbleGroups: any, 
    _layoutNodes: LayoutNode[], 
    data: ProcessedDataPoint<T>[]
  ): any {
    const { config: _config } = this.context;

    return bubbleGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', (d: LayoutNode) => this.calculateFontSize(d.r))
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text((d: LayoutNode, i: number) => {
        const label = this.extractLabel(d, i, data);
        return this.formatLabel(label, d.r);
      });
  }

  /**
   * Apply entrance animations to bubble elements
   * @param elements - Bubble elements to animate
   * @param animationConfig - Animation configuration
   */
  applyEntranceAnimation(
    elements: BubbleElements,
    animationConfig: { duration?: number; delay?: number } = {}
  ): void {
    const { duration = 800, delay = 0 } = animationConfig;

    // Animate circles
    elements.circles
      .attr('r', 0)
      .style('opacity', 0)
      .transition()
      .delay((_d: any, i: number) => delay + i * 50)
      .duration(duration)
      .attr('r', (d: LayoutNode) => d.r)
      .style('opacity', 0.8);

    // Animate labels
    elements.labels
      .style('opacity', 0)
      .transition()
      .delay((_d: any, i: number) => delay + i * 50 + 200)
      .duration(duration / 2)
      .style('opacity', 1);
  }

  /**
   * Update existing bubble elements with new data
   * @param elements - Existing bubble elements
   * @param newLayoutNodes - New layout nodes
   * @param newData - New processed data
   */
  updateBubbleElements(
    elements: BubbleElements,
    newLayoutNodes: LayoutNode[],
    newData: ProcessedDataPoint<T>[]
  ): void {
    const { config: _config } = this.context;

    // Update data binding
    const updatedGroups = elements.bubbleGroups.data(newLayoutNodes);

    // Update positions
    updatedGroups
      .transition()
      .duration(500)
      .attr('transform', (d: LayoutNode) => `translate(${d.x}, ${d.y})`);

    // Update circles
    elements.circles
      .transition()
      .duration(500)
      .attr('r', (d: LayoutNode) => d.r)
      .style('fill', (d: LayoutNode, i: number) => this.getCircleColor(d, i));

    // Update labels
    elements.labels
      .transition()
      .duration(500)
      .style('font-size', (d: LayoutNode) => this.calculateFontSize(d.r))
      .text((d: LayoutNode, i: number) => {
        const label = this.extractLabel(d, i, newData);
        return this.formatLabel(label, d.r);
      });
  }

  /**
   * Calculate appropriate font size based on bubble radius
   * @param radius - Bubble radius
   * @returns Font size in pixels
   */
  private calculateFontSize(radius: number): string {
    const fontSize = Math.max(10, Math.min(20, radius / 3));
    return `${fontSize}px`;
  }

  /**
   * Get circle color based on configuration
   * @param layoutNode - Layout node
   * @param index - Node index
   * @returns Color string
   */
  private getCircleColor(_layoutNode: LayoutNode, index: number): string {
    const { config } = this.context;

    if (config.color) {
      // Use index as color key to match traditional implementation behavior
      // This ensures each bubble gets a different color from the ordinal scale
      return config.color(index.toString());
    }

    return config.defaultColor || '#ddd';
  }



  /**
   * Extract label text from layout node
   * @param layoutNode - Layout node
   * @param index - Node index
   * @param data - Original processed data
   * @returns Label text
   */
  private extractLabel(
    layoutNode: LayoutNode, 
    index: number, 
    data: ProcessedDataPoint<T>[]
  ): string {
    const { config } = this.context;

    // Use processed data label if available
    if (data[index]?.label) {
      return data[index].label;
    }

    // Fall back to raw data extraction
    const nodeData = layoutNode.data;
    if (typeof config.label === 'string') {
      return String(nodeData[config.label] || 'Unknown');
    }

    return 'Unknown';
  }

  /**
   * Format label text to fit within bubble
   * @param label - Original label text
   * @param radius - Bubble radius
   * @returns Formatted label text
   */
  private formatLabel(label: string, radius: number): string {
    const { config } = this.context;

    // Apply text formatting if configured
    let formattedLabel = config.format?.text 
      ? config.format.text(label) 
      : label;

    // Truncate if too long for bubble size
    const maxLength = Math.max(3, Math.floor(radius / 4));
    if (formattedLabel.length > maxLength) {
      formattedLabel = formattedLabel.substring(0, maxLength - 1) + '…';
    }

    return formattedLabel;
  }

  /**
   * Create clip paths for advanced animations (e.g., wave effects)
   * @param elements - Bubble elements
   * @returns Clip path selections
   */
  createClipPaths(elements: BubbleElements): any {
    const { svg } = this.context;

    // Create defs section if it doesn't exist
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
    }

    // Create clip paths for each bubble
    const clipPaths = defs.selectAll('.bubble-clip')
      .data(elements.bubbleGroups.data())
      .enter()
      .append('clipPath')
      .attr('class', 'bubble-clip')
      .attr('id', (_d: any, i: number) => `bubble-clip-${i}`);

    clipPaths.append('circle')
      .attr('cx', (d: LayoutNode) => d.x)
      .attr('cy', (d: LayoutNode) => d.y)
      .attr('r', (d: LayoutNode) => d.r);

    return clipPaths;
  }

  /**
   * Add responsive behavior to rendered elements
   * @param elements - Bubble elements
   * @param onResize - Callback for resize events
   */
  makeResponsive(
    _elements: BubbleElements,
    onResize: (newWidth: number, newHeight: number) => void
  ): void {
    // This would typically be handled by the SVGManager
    // but we can provide layout-specific responsive behavior here
    
    const handleResize = () => {
      const { svg } = this.context;
      const container = svg.node()?.parentElement;
      
      if (container) {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        onResize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
  }
} 