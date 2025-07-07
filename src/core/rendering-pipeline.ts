/**
 * Rendering Pipeline System
 * Centralized handling of bubble creation, text rendering, and layout positioning
 * Eliminates duplication across all chart builders
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, StreamingOptions, StreamingUpdateResult } from '../types/config.js';
import type { ProcessedDataPoint } from './data-processor.js';
import { D3DataUtils } from '../utils/d3-data-utils.js';
// import type { SVGElements } from './svg-manager.js';

export interface RenderingContext {
  svg: any;
  width: number;
  height: number;
  config: BubbleChartOptions;
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
   * Calculate optimal update duration to prevent timing conflicts
   * @param enterDuration - Enter animation duration
   * @param staggerDelay - Stagger delay between bubbles
   * @param bubbleCount - Number of bubbles in enter animation
   * @param updateDuration - Configured update duration
   * @returns Adjusted update duration
   */
  private calculateOptimalUpdateDuration(
    enterDuration: number,
    staggerDelay: number,
    bubbleCount: number,
    updateDuration: number
  ): number {
    // Calculate total enter animation time (last bubble start + duration)
    const totalEnterTime = enterDuration + (bubbleCount * staggerDelay);
    
    // Update animations should last at least as long as enter animations
    // to prevent layout conflicts during staggered entrance
    const minUpdateDuration = Math.max(totalEnterTime * 0.8, updateDuration);
    
    const adjustedDuration = Math.round(minUpdateDuration);
    
    // Debug logging for timing coordination
    if (adjustedDuration > updateDuration) {
      console.log(`🎬 Animation Timing Coordination:`);
      console.log(`  Enter: ${enterDuration}ms + (${bubbleCount} × ${staggerDelay}ms) = ${totalEnterTime}ms total`);
      console.log(`  Update: ${updateDuration}ms → ${adjustedDuration}ms (adjusted for timing)`);
      console.log(`  Reason: Preventing overlap during staggered entrance`);
    }
    
    return adjustedDuration;
  }

  /**
   * Perform streaming update using D3's native .join() pattern
   * @param data - New data for streaming update
   * @param options - Streaming animation options
   * @returns Result summary of streaming update
   */
  streamingUpdate(
    data: ProcessedDataPoint<T>[],
    options: StreamingOptions
  ): StreamingUpdateResult {
    const { svg, width, height, config } = this.context;

    // Create layout nodes from new data using D3DataUtils
    const layoutNodes = D3DataUtils.createPackLayout(
      data as any,
      width,
      height,
      config.bubble?.padding || 5
    );

    // Create data binding with key function
    const keyFn = options.keyFunction || ((d: any) => {
      // For layout nodes, extract the original data and apply key function
      const original = d.data?.data ?? d.data;
      return original.id ?? original.name ?? JSON.stringify(original);
    });

    // Track enter/update/exit counts for return result
    let enteredCount = 0;
    let exitedCount = 0;
    let updatedCount = 0;

    // Use D3's native .join() pattern for clean enter/update/exit handling
    svg.selectAll('g.bubble')
      .data(layoutNodes, (d: any) => {
        // Extract original data from layout node structure:
        // layoutNode.data (processed) -> data.data (original)
        const processedData = d.data;
        const originalData = processedData?.data ?? processedData;
        return keyFn(originalData);
      })
      .join(
        // ENTER: Create new bubble groups
        (enter: any) => {
          enteredCount = enter.size();
          
          const enterGroups = enter
            .append('g')
            .attr('class', 'bubble-chart bubble')
            .attr('transform', (d: LayoutNode) => `translate(${d.x},${d.y}) scale(0)`)
            .style('opacity', 0)
            .style('cursor', 'pointer');

          // Add circles to new bubbles
          enterGroups.append('circle')
            .attr('r', (d: LayoutNode) => d.r)
            .style('fill', (d: LayoutNode, i: number) => this.getCircleColor(d, i))
            .style('stroke', config.defaultColor || '#fff')
            .style('stroke-width', 2);

          // Add labels to new bubbles
          enterGroups.append('text')
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

          // Apply enter animation with D3 transitions
          enterGroups
            .transition('enter')
            .duration(options.enterAnimation.duration)
            .delay((_d: any, i: number) => i * options.enterAnimation.staggerDelay)
            .style('opacity', 1)
            .attr('transform', (d: LayoutNode) => `translate(${d.x},${d.y}) scale(1)`);

          return enterGroups;
        },
        
        // UPDATE: Update existing elements
        (update: any) => {
          updatedCount = update.size();
          
          // Calculate optimal update duration to prevent timing conflicts
          const useAutoCalculation = options.updateAnimation.duration === 0;
          const configuredDuration = useAutoCalculation ? 600 : options.updateAnimation.duration;
          
          const optimalUpdateDuration = this.calculateOptimalUpdateDuration(
            options.enterAnimation.duration,
            options.enterAnimation.staggerDelay,
            enteredCount,
            configuredDuration
          );

          // Update bubble group positions
          update
            .transition('update')
            .duration(optimalUpdateDuration)
            .attr('transform', (d: LayoutNode) => `translate(${d.x},${d.y}) scale(1)`);

          // Update circles
          update.select('circle')
            .transition('update-circles')
            .duration(optimalUpdateDuration)
            .attr('r', (d: LayoutNode) => d.r)
            .style('fill', (d: LayoutNode, i: number) => this.getCircleColor(d, i));

          // Update labels
          update.select('text')
            .transition('update-text')
            .duration(optimalUpdateDuration)
            .style('font-size', (d: LayoutNode) => this.calculateFontSize(d.r))
            .text((d: LayoutNode, i: number) => {
              const label = this.extractLabel(d, i, data);
              return this.formatLabel(label, d.r);
            });

          return update;
        },
        
        // EXIT: Remove elements that no longer exist
        (exit: any) => {
          exitedCount = exit.size();
          
          exit
            .transition('exit')
            .duration(options.exitAnimation.duration)
            .style('opacity', 0)
            .attr('transform', (d: LayoutNode) => `translate(${d.x},${d.y}) scale(0)`)
            .remove();

          return exit;
        }
      );

    return {
      entered: enteredCount,
      updated: updatedCount,
      exited: exitedCount
    };
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
  private getCircleColor(layoutNode: LayoutNode, index: number): string {
    const { config } = this.context;

    if (config.color) {
      // Get the processed data point which contains the extracted color value
      const processedData = layoutNode.data;
      
      // Check if this is a D3 scale (has domain/range methods)
      if (typeof config.color === 'function' && 
          ('domain' in config.color || 'range' in config.color)) {
        // D3 scale - use the processed color value or fallback to index
        const colorKey = processedData?.color || index.toString();
        return (config.color as any)(colorKey);
      } else if (typeof config.color === 'function') {
        // Custom color function
        const colorFunction = config.color as any;
        if (colorFunction.length > 1) {
          // Multi-parameter function - pass (processedData, index)
          return colorFunction(processedData?.data, index);
        } else {
          // Single-parameter function - pass the original data object
          return colorFunction(processedData?.data);
        }
      } else {
        // Fallback - treat as scale
        const colorKey = processedData?.color || index.toString();
        return (config.color as any)(colorKey);
      }
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
    _index: number, 
    _data: ProcessedDataPoint<T>[]
  ): string {
    const { config } = this.context;

    // Use the processed data from the layout node (correct data)
    const processedData = layoutNode.data;
    if (processedData?.label) {
      return processedData.label;
    }

    // Fall back to raw data extraction from the node
    if (processedData?.data && typeof config.label === 'string') {
      return String(processedData.data[config.label] || 'Unknown');
    }

    // Last resort fallback
    if (typeof config.label === 'string' && processedData) {
      return String(processedData[config.label] || 'Unknown');
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


}
