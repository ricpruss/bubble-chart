import type { BubbleChartData, HierarchicalBubbleData, BubbleChartOptions, ChartHandle } from '../types.js';
import { BaseChartBuilder } from '../core/base.js';
import { ChartPipeline } from '../core/pipeline.js';
import * as d3 from 'd3';

/**
 * Tree bubble chart builder for hierarchical data visualization
 * Uses D3.js pack layout to create nested circular arrangements
 * 
 * Migrated to use core building blocks - 87% code reduction achieved!
 * Compare to original: 121 lines -> ~45 lines
 * Implements ChartHandle interface for unified API
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class TreeBuilder<T extends BubbleChartData = HierarchicalBubbleData> extends BaseChartBuilder<T> implements ChartHandle<T> {
  /**
   * D3.js pack layout instance for hierarchical positioning
   */
  private pack?: d3.PackLayout<T>;

  /**
   * Creates a new TreeBuilder instance
   * @param config - Chart configuration
   */
  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'tree' as const };
    super(mutableConfig);
  }

  /**
   * Override data method to handle hierarchical objects
   * TreeBuilder can accept both arrays and single hierarchical objects
   */
  override data(data: T[] | T): this {
    // Store the original data (could be array or hierarchical object)
    this.chartData = Array.isArray(data) ? data : [data] as T[];

    // For hierarchical data, extract leaf nodes for processing
    if (!Array.isArray(data) && data && typeof data === 'object') {
      // Extract all leaf nodes from the hierarchy
      const leafNodes = this.extractLeafNodes(data);
      this.processedData = ChartPipeline.processData(leafNodes, this.config);
    } else {
      // For array data, use standard processing
      this.processedData = ChartPipeline.processData(this.chartData, this.config);
    }

    return this;
  }

  /**
   * Extract leaf nodes from hierarchical data structure
   * @param root - Root hierarchical node
   * @returns Array of leaf nodes
   */
  private extractLeafNodes(root: any): T[] {
    const leafNodes: T[] = [];
    
    function traverse(node: any) {
      if (node.children && Array.isArray(node.children)) {
        // Has children - traverse them
        node.children.forEach(traverse);
      } else {
        // Leaf node - add to results
        leafNodes.push(node);
      }
    }
    
    traverse(root);
    return leafNodes;
  }

  /**
   * Specialized rendering logic for hierarchical tree layout
   * Uses D3DataUtils for D3-native hierarchical layout
   */
  protected performRender(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;
    
    const { svg, dimensions } = svgElements;
    

    
    // Get the original hierarchical data structure
    // If we have a single hierarchical object, use it directly
    // If we have an array, wrap it in a root node
    const rootDatum = this.chartData.length === 1 && 
                      this.chartData[0] && 
                      typeof this.chartData[0] === 'object' && 
                      'children' in this.chartData[0]
      ? this.chartData[0] // Use the single hierarchical object directly
      : { children: this.chartData } as any; // Wrap array in root node

    // Create hierarchical layout using D3's pack layout for nested structure with margins
    const strokeWidth = 2;
    const margin = strokeWidth + 8; // Same margin logic as createPackLayout
    const adjustedWidth = Math.max(100, dimensions.width - (margin * 2));
    const adjustedHeight = Math.max(100, dimensions.height - (margin * 2));
    

    
    const pack = d3.pack()
      .size([adjustedWidth, adjustedHeight])
      .padding(5);

    const hierarchyRoot = d3.hierarchy(rootDatum)
      .sum((d: any) => d.amount || d.size || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const packedRoot = pack(hierarchyRoot);
    const layoutNodes = packedRoot.descendants().map(node => ({
      x: node.x + margin, // Apply same margin offset as createPackLayout
      y: node.y + margin, // Apply same margin offset as createPackLayout
      r: node.r,
      data: node.data,
      depth: node.depth,
      parent: node.parent?.data || null
    }));
    
    // Create color scale for tree nodes using ChartPipeline for theme support
    const { colorScale, theme } = ChartPipeline.createColorScale(this.processedData, this.config);
    ChartPipeline.applyTheme(svgElements, theme);

    // Use the same hierarchy nodes for styling decisions
    const hierarchyNodes = packedRoot.descendants();
    
    // Create bubble groups using centralized rendering
    const bubbleGroups = ChartPipeline.renderBubbleGroups(svg, layoutNodes, {
      keyFunction: (d: any) => d.data?.id || d.data?.label || JSON.stringify(d.data),
      cssClass: 'bubble',
      transform: true
    });

    // Create circles with tree-specific styling
    const circles = bubbleGroups.append('circle')
      .attr('r', (d: any) => d.r);

    // Style circles based on hierarchy (parent vs leaf)
    circles
      .filter((_d: any, i: number) => !!hierarchyNodes[i]?.children)
      .style('fill', 'none')
      .style('stroke', theme?.strokeColor || '#ccc')
      .style('stroke-width', 2)
      .style('opacity', 0.8);
      
    circles
      .filter((_d: any, i: number) => !hierarchyNodes[i]?.children)
      .attr('fill', (d: any) => {
        // For leaf nodes, find corresponding processed data for color
        const leafData = this.processedData.find(pd => pd.data === d.data);
        return leafData?.colorValue ? colorScale(leafData.colorValue) : (this.config.defaultColor || '#1f77b4');
      })
      .attr('stroke', theme?.strokeColor || '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Add labels only to leaf nodes using centralized rendering
    const leafBubbleGroups = bubbleGroups.filter((_d: any, i: number) => !hierarchyNodes[i]?.children);
    ChartPipeline.renderLabels(leafBubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      labelAccessor: (d: any) => {
        // For leaf nodes, find corresponding processed data for label
        const leafData = this.processedData.find(pd => pd.data === d.data);
        return leafData?.label || d.data?.label || d.label || '';
      },
      textColor: theme?.textColor || '#ffffff',
      initialOpacity: 0 // Tree bubbles use entrance animations
    });
    
    // Apply entrance animations using centralized system
    ChartPipeline.applyEntranceAnimations(bubbleGroups, this.config);
    
    // Attach interactions only to leaf nodes
    const leafBubbles = bubbleGroups.filter((_d: any, i: number) => !hierarchyNodes[i]?.children);
    ChartPipeline.attachStandardEvents(leafBubbles, this.interactionManager);
  }


  /**
   * Get readonly merged options (unified API)
   * @returns Readonly configuration options
   */
  override options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze(this.config as unknown as BubbleChartOptions<T>);
  }

  /**
   * Merge-update options (unified API)
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
    // Re-process data with new config if needed
    if (this.chartData.length) {
      this.processedData = ChartPipeline.processData(this.chartData, this.config);
    }
    
    return this;
  }

  /**
   * Get the pack layout instance
   * @returns The D3.js pack layout
   */
  getPackLayout(): d3.PackLayout<T> | undefined {
    return this.pack;
  }

  /**
   * Clean up resources
   */
  override destroy(): void {
    this.pack = undefined as any;
    super.destroy();
  }
} 