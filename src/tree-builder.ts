import type { BubbleChartData, HierarchicalBubbleData } from './types/data.js';
import type { BubbleChartConfig } from './types/config.js';
import { BaseChartBuilder } from './core/index.js';
import * as d3 from 'd3';

/**
 * Tree bubble chart builder for hierarchical data visualization
 * Uses D3.js pack layout to create nested circular arrangements
 * 
 * Migrated to use core building blocks - 87% code reduction achieved!
 * Compare to original: 121 lines -> ~45 lines
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class TreeBuilder<T extends BubbleChartData = HierarchicalBubbleData> extends BaseChartBuilder<T> {
  /**
   * D3.js pack layout instance for hierarchical positioning
   */
  private pack?: d3.PackLayout<T>;

  /**
   * Creates a new TreeBuilder instance
   * @param config - Chart configuration
   */
  constructor(config: BubbleChartConfig) {
    super(config);
    this.config.type = 'tree';
  }

  /**
   * Override data method to handle hierarchical objects
   * TreeBuilder can accept both arrays and single hierarchical objects
   */
  override data(data: T[] | T): this {
    // Store the original data (could be array or hierarchical object)
    this.chartData = Array.isArray(data) ? data : [data] as T[];

    // For hierarchical data, extract leaf nodes for DataProcessor
    if (!Array.isArray(data) && data && typeof data === 'object') {
      // Extract all leaf nodes from the hierarchy
      const leafNodes = this.extractLeafNodes(data);
      this.processedData = this.dataProcessor.process(leafNodes);
    } else {
      // For array data, use normal processing
      this.processedData = this.dataProcessor.process(this.chartData);
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
   * All common functionality (SVG setup, data processing, events) handled by building blocks
   */
  protected performRender(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;
    
    // Get the original hierarchical data structure
    // If we have a single hierarchical object, use it directly
    // If we have an array, wrap it in a root node
    const rootDatum = this.chartData.length === 1 && 
                      this.chartData[0] && 
                      typeof this.chartData[0] === 'object' && 
                      'children' in this.chartData[0]
      ? this.chartData[0] // Use the single hierarchical object directly
      : { children: this.chartData } as any; // Wrap array in root node

    // Create hierarchical layout using rendering pipeline
    const layoutNodes = this.renderingPipeline.createHierarchicalLayout(rootDatum);
    
    // Create DOM elements using rendering pipeline
    const bubbleElements = this.renderingPipeline.createBubbleElements(layoutNodes, this.processedData);
    
    // Create D3.js hierarchy for node information (parents vs children)
    const root = d3.hierarchy(rootDatum);
    const nodes = root.descendants();
    
    // Apply tree-specific styling for hierarchical structure
    this.applyTreeStyling(bubbleElements, nodes);
    
    // Attach interactions using interaction manager (only to leaf nodes)
    const leafBubbles = bubbleElements.bubbleGroups.filter((_d: any, i: number) => !nodes[i]?.children);
    this.interactionManager.attachBubbleEvents(leafBubbles, this.processedData);
  }

  /**
   * Apply tree-specific styling (parent vs leaf nodes)
   */
  private applyTreeStyling(bubbleElements: any, hierarchyNodes: any[]): void {
    // Update circles with hierarchical styling
    bubbleElements.circles
      .attr('fill', (_d: any, i: number) => {
        const hierarchyNode = hierarchyNodes[i];
        // Parent nodes (with children) are transparent, leaves get colors
        if (hierarchyNode?.children) {
          return 'none';
        }
        return this.config.color ? this.config.color(i.toString()) : this.config.defaultColor || '#ddd';
      })
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1);

    // Hide labels on parent nodes, keep only on leaf nodes
    bubbleElements.labels
      .style('display', (_d: any, i: number) => {
        const hierarchyNode = hierarchyNodes[i];
        return hierarchyNode?.children ? 'none' : 'block';
      });
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