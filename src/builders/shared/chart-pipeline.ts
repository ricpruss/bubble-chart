import { D3DataUtils } from '../../d3/index.js';

import type { BubbleChartOptions } from '../../config/index.js';
import type { BubbleChartData } from '../../data/index.js';
import { D3DataUtils } from '../../d3/index.js';
import * as d3 from 'd3';

/**
 * Shared chart pipeline for common bubble chart operations
 * Extracts duplicated logic from all builders
 */
export const ChartPipeline = {
  /**
   * Process data with color accessor - extracted from all builders
   * @param data - Raw chart data
   * @param config - Chart configuration
   * @returns Processed data ready for visualization
   */
processData<T extends BubbleChartData>(data: T[], config: BubbleChartOptions): D3DataUtils.D3ProcessedData<T>[] {
    const colorConfig = config.color;
    const colorAccessor = (typeof colorConfig === 'string' || typeof colorConfig === 'function') 
      ? colorConfig as (string | ((d: BubbleChartData) => string))
      : undefined;

    return D3DataUtils.processForVisualization<T>(
      data,
      config.label || 'label',
      config.size || 'size',
      colorAccessor
    ) as D3DataUtils.D3ProcessedData<T>[];
  },

  /**
   * Create bubble layout using D3DataUtils - extracted from BubbleBuilder
   * @param processedData - Processed data
   * @param width - SVG width
   * @param height - SVG height
   * @param padding - Bubble padding
   * @returns Layout nodes with positions
   */
  createBubbleLayout(processedData: any[], width: number, height: number, padding: number): any[] {
    return D3DataUtils.createPackLayout(processedData, width, height, padding);
  },

  /**
   * Create color scale with automatic palette selection - extracted from all builders
   * @param processedData - Processed data
   * @param config - Chart configuration
   * @returns Color scale function and theme information
   */
  createColorScale(processedData: any[], config: BubbleChartOptions): {
    colorScale: any;
    theme?: any;
  } {
    const colorValues = D3DataUtils.getUniqueValues(processedData, 'colorValue');
    
    if (colorValues.length === 0) {
      // Still use theme system but with default color
      const themeName = D3DataUtils.getThemeForChartType(
        config.type || 'bubble',
        config.theme
      );
      const themeData = D3DataUtils.THEMED_PALETTES[themeName];
      return { 
        colorScale: () => config.defaultColor || '#1f77b4',
        theme: themeData
      };
    }
    
    // Always use themed palette system for better consistency
    const themeName = D3DataUtils.getThemeForChartType(
      config.type || 'bubble',
      config.theme
    );
    const { colorScale, theme } = D3DataUtils.createThemedPalette(colorValues, themeName);
    return { colorScale, theme };
    
    // Fall back to legacy palette system
    let paletteType: keyof typeof D3DataUtils.COLOR_PALETTES = 'vibrant';
    
    if (config.palette) {
      paletteType = config.palette as keyof typeof D3DataUtils.COLOR_PALETTES;
    }
    
    return { 
      colorScale: D3DataUtils.createColorScale(colorValues, paletteType)
    };
  },

  /**
   * Create font scale - extracted from all builders
   * @param layoutNodes - Layout nodes to calculate radius extent
   * @returns Font scale function
   */
  createFontScale(layoutNodes: any[]): any {
    const radiusExtent = d3.extent(layoutNodes, (d: any) => d.r) as [number, number];
    return D3DataUtils.createFontScale(radiusExtent, [10, 18]);
  },

  /**
   * Apply entrance animations - standardized across all builders
   * @param bubbleGroups - D3 selection of bubble groups
   * @param config - Chart configuration
   */
  applyEntranceAnimations(bubbleGroups: any, config: BubbleChartOptions): void {
    if (config.animation) {
      const duration = config.animation?.enter?.duration || 800;
      const staggerDelay = config.animation?.enter?.stagger || 0;
      
      // Animate all circles (they start with r=0 and opacity=0)
      bubbleGroups.selectAll('circle')
        .transition()
        .delay((_d: any, i: number) => i * staggerDelay)
        .duration(duration)
        .attr('r', (d: any) => d.r)
        .style('opacity', 0.8);

      // Animate all labels (they start with opacity=0)
      bubbleGroups.selectAll('text')
        .transition()
        .delay((_d: any, i: number) => i * staggerDelay + (staggerDelay > 0 ? 200 : 0))
        .duration(duration / 2)
        .style('opacity', 1);
    } else {
      // No animations - set final values immediately
      bubbleGroups.selectAll('circle')
        .attr('r', (d: any) => d.r)
        .style('opacity', 0.8);
      
      bubbleGroups.selectAll('text')
        .style('opacity', 1);
    }
  },

  /**
   * Render labels with consistent styling - centralized text rendering
   * @param bubbleGroups - D3 selection of bubble groups
   * @param options - Rendering options
   * @returns Text selection for further manipulation if needed
   */
  renderLabels(bubbleGroups: any, options: {
    radiusAccessor: (d: any) => number;
    labelAccessor: (d: any) => string;
    textColor: string;
    maxLength?: number;
    formatFunction?: ((text: string) => string) | undefined;
    initialOpacity?: number; // Allow override for charts without entrance animations
  }): any {
    return bubbleGroups.selectAll('text')
      .data((d: any) => [d]) // One text per bubble group
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('fill', options.textColor)
      .style('font-size', (d: any) => this.calculateFontSize(options.radiusAccessor(d)))
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('opacity', options.initialOpacity !== undefined ? options.initialOpacity : 0) // Allow override
      .text((d: any) => {
        const label = options.labelAccessor(d);
        const formatted = options.formatFunction ? options.formatFunction(label) : label;
        return D3DataUtils.formatLabel(formatted, options.maxLength || 15);
      });
  },

  /**
   * Calculate font size based on radius with better scaling
   * @param radius - Bubble radius
   * @returns Font size as string with 'px' unit
   */
  calculateFontSize(radius: number): string {
    // Centralized font size calculation with better scaling
    const baseFontSize = Math.max(10, radius / 3);
    const scaledSize = Math.min(baseFontSize, 24); // Max font size for readability
    return `${scaledSize}px`;
  }
};
