import type { BubbleChartOptions } from '../../config/index.js';
import type { BubbleChartData } from '../../data/index.js';
import { D3DataUtils } from '../../d3/index.js';
import type { InteractionManager } from '../../core/interaction-manager.js';
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
processData<T extends BubbleChartData>(data: T[], config: BubbleChartOptions): any[] {
    const colorConfig = config.color;
    const colorAccessor = (typeof colorConfig === 'string' || typeof colorConfig === 'function') 
      ? colorConfig as (string | ((d: BubbleChartData) => string))
      : undefined;

    return D3DataUtils.processForVisualization<T>(
      data,
      config.label || 'label',
      config.size || 'size',
      colorAccessor
    );
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
   * Calculate font size based on radius using D3 scale for consistency
   * @param radius - Bubble radius
   * @param radiusRange - Expected radius range for domain [min, max]
   * @returns Font size as string with 'px' unit
   */
  calculateFontSize(radius: number, radiusRange: [number, number] = [0, 100]): string {
    // Use D3 scale for consistent font sizing
    const fontScale = d3.scaleLinear()
      .domain(radiusRange)
      .range([10, 24])
      .clamp(true);
    return `${fontScale(radius)}px`;
  },

  /**
   * Create radius scale using D3DataUtils - centralized for all builders
   * @param data - Processed data
   * @param range - Output range [min, max]
   * @returns D3 radius scale
   */
  createRadiusScale(data: any[], range: [number, number]): d3.ScalePower<number, number> {
    return D3DataUtils.createRadiusScale(data, (d) => d.size, range);
  },

  /**
   * Apply theme to SVG container
   * @param svgElements - SVG elements from SVG manager
   * @param theme - Theme data
   */
  applyTheme(svgElements: any, theme: any): void {
    if (theme?.background && svgElements?.svg?.style) {
      svgElements.svg.style('background', theme.background);
    }
  },

  /**
   * Create key function for D3 data binding
   * @param config - Chart configuration
   * @returns Key function or undefined
   */
  createKeyFunction(config: BubbleChartOptions): ((d: any) => string) | undefined {
    if (config.keyFunction) {
      return (d: any) => {
        // Handle nested data structure: d.data.data contains the original data
        const originalData = d.data?.data || d.data || d;
        return String(config.keyFunction!(originalData));
      };
    }
    return undefined;
  },

  /**
   * Render bubble groups with D3's native data binding
   * @param svg - D3 selection of SVG element
   * @param nodes - Layout nodes
   * @param config - Rendering configuration
   * @returns D3 selection of bubble groups
   */
  renderBubbleGroups(svg: any, nodes: any[], config: {
    keyFunction?: (d: any) => string;
    cssClass?: string;
    transform?: boolean;
  }): any {
    const keyFunction = config.keyFunction;
    const cssClass = config.cssClass || 'bubble-chart bubble';
    
    return svg.selectAll('.bubble')
      .data(nodes, keyFunction)
      .join('g')
      .attr('class', cssClass)
      .attr('transform', config.transform !== false ? 
        (d: any) => `translate(${d.x}, ${d.y})` : null)
      .style('cursor', 'pointer');
  },

  /**
   * Render circles with consistent styling
   * @param groups - D3 selection of bubble groups
   * @param config - Circle rendering configuration
   * @returns D3 selection of circles
   */
  renderCircles(groups: any, config: {
    radiusAccessor?: (d: any) => number;
    colorAccessor?: (d: any) => string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    initialRadius?: number | ((d: any) => number);
    initialOpacity?: number;
  }): any {
    const radiusAccessor = config.radiusAccessor || ((d: any) => d.r);
    const colorAccessor = config.colorAccessor || (() => '#1f77b4');
    const strokeColor = config.strokeColor || '#fff';
    const strokeWidth = config.strokeWidth || 2;
    const opacity = config.opacity || 0.8;
    const initialRadius = config.initialRadius || 0;
    const initialOpacity = config.initialOpacity || 0;
    
    return groups.selectAll('circle')
      .data((d: any) => [d])
      .join('circle')
      .attr('r', typeof initialRadius === 'function' ? initialRadius : initialRadius)
      .style('opacity', initialOpacity)
      .attr('fill', colorAccessor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .transition()
      .duration(300)
      .attr('r', radiusAccessor)
      .style('opacity', opacity);
  },

  /**
   * Attach standard events to bubble groups
   * @param groups - D3 selection of bubble groups
   * @param interactionManager - Interaction manager instance
   */
  attachStandardEvents(groups: any, _interactionManager: InteractionManager<any>): void {
    // Standard hover effects
    groups
      .on('mouseover', function(this: SVGGElement, _event: MouseEvent, _d: any) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('stroke', '#333');
      })
      .on('mouseout', function(this: SVGGElement, _event: MouseEvent, _d: any) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', 2)
          .attr('stroke', '#fff');
      });
    
    // Delegate to interaction manager for other events
    // The interaction manager will handle tooltips and custom events
  },

  /**
   * Text wrapping utility for SVG text elements
   * @param textSelection - D3 selection of text elements
   * @param width - Maximum width for wrapping
   */
  wrapText(textSelection: any, width: number): void {
    textSelection.each(function(this: SVGTextElement) {
      const textElement = d3.select(this);
      const words = textElement.text().split(/\s+/).reverse();
      const lineHeight = 1.1;
      const y = textElement.attr('y');
      const dy = parseFloat(textElement.attr('dy'));
      
      let line: string[] = [];
      let lineNumber = 0;
      let word: string | undefined;
      let tspan = textElement.text(null).append('tspan')
        .attr('x', textElement.attr('x'))
        .attr('y', y)
        .attr('dy', dy + 'em');

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(' '));
        
        if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = textElement.append('tspan')
            .attr('x', textElement.attr('x'))
            .attr('y', y)
            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
            .text(word);
        }
      }
    });
  }
};
