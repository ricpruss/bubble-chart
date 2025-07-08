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
    
    // Adjusted duration calculated to prevent timing conflicts
    
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

    // Create D3 scales for styling
    const radiusExtent = layoutNodes.length > 0 ? 
      [Math.min(...layoutNodes.map(d => d.r)), Math.max(...layoutNodes.map(d => d.r))] as [number, number] :
      [10, 50] as [number, number];
    const fontScale = D3DataUtils.createFontScale(radiusExtent, [10, 20]);
    
    // Create color scale if color data exists
    const colorValues = D3DataUtils.getUniqueValues(data as any, 'colorValue');
    const colorScale = colorValues.length > 0 ? 
      D3DataUtils.createColorScale(colorValues) : 
      () => config.defaultColor || '#ddd';

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
            .style('fill', (d: LayoutNode) => {
              const processedData = d.data;
              return processedData?.colorValue ? colorScale(processedData.colorValue) : (config.defaultColor || '#ddd');
            })
            .style('stroke', config.defaultColor || '#fff')
            .style('stroke-width', 2);

          // Add labels to new bubbles
          enterGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', (d: LayoutNode) => `${fontScale(d.r)}px`)
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .style('pointer-events', 'none')
            .text((d: LayoutNode) => {
              const processedData = d.data;
              const label = processedData?.label || 'Unknown';
              const maxLength = Math.max(3, Math.floor(d.r / 4));
              return D3DataUtils.formatLabel(label, maxLength);
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
            .style('fill', (d: LayoutNode) => {
              const processedData = d.data;
              return processedData?.colorValue ? colorScale(processedData.colorValue) : (config.defaultColor || '#ddd');
            });

          // Update labels
          update.select('text')
            .transition('update-text')
            .duration(optimalUpdateDuration)
            .style('font-size', (d: LayoutNode) => `${fontScale(d.r)}px`)
            .text((d: LayoutNode) => {
              const processedData = d.data;
              const label = processedData?.label || 'Unknown';
              const maxLength = Math.max(3, Math.floor(d.r / 4));
              return D3DataUtils.formatLabel(label, maxLength);
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




}
