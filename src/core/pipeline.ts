/**
 * ChartPipeline - Centralized Composition Engine
 * Moved from src/builders/shared/ to core for better organization
 * Uses unified types and utilities from consolidated files
 */

import * as d3 from 'd3';
import type { 
  BubbleChartData, 
  ProcessedDataPoint, 
  BubbleChartOptions,
  SVGElements
} from '../types.js';
import { 
  processForVisualization, 
  createPackLayout, 
  createThemedPalette,
  createRadiusScale,
  getThemeForChartType,
  formatLabel,
  wrapText
} from './utils.js';

/**
 * ChartPipeline - The composition engine that eliminates code duplication
 * All builders use these shared methods instead of implementing their own
 */
export class ChartPipeline {
  
  /**
   * Process raw data into visualization-ready format
   * Replaces individual data processing in each builder
   */
  static processData<T extends BubbleChartData>(data: T[], config: BubbleChartOptions): ProcessedDataPoint<T>[] {
    if (!data || data.length === 0) return [];
    
    const colorAccessor = typeof config.colour === 'string' ? config.colour : 
                        typeof config.color === 'string' ? config.color :
                        (typeof config.color === 'function' && !('domain' in config.color)) ? 
                          config.color as ((d: T) => string) : undefined;
    
    return processForVisualization(
      data,
      config.label,
      config.size,
      colorAccessor,
      config.time,
      config.percentage
    );
  }

  /**
   * Create bubble pack layout using D3's native pack layout
   */
  static createBubbleLayout(processedData: ProcessedDataPoint[], width: number, height: number, padding: number): any[] {
    if (!processedData || processedData.length === 0) return [];
    

    return createPackLayout(processedData, width, height, padding);
  }

  /**
   * Create color scale with theme support
   * Returns both the color scale and theme object for background styling
   */
    static createColorScale(processedData: ProcessedDataPoint[], config: BubbleChartOptions): {
    colorScale: any;
    theme?: any;
  } {
    // Extract unique color values for scale domain
    const colorValues = [...new Set(
      processedData
        .map(d => d.colorValue || d.label)
        .filter(v => v !== undefined && v !== null)
    )];

    // Use themed palette if theme is specified, otherwise use default theme
    const themeName = config.theme 
      ? getThemeForChartType(config.type || 'bubble', config.theme)
      : getThemeForChartType(config.type || 'bubble');
    
    return createThemedPalette(colorValues, themeName);
  }

  /**
   * Create font scale for responsive text sizing
   */
  static createFontScale(layoutNodes: any[]): any {
    if (!layoutNodes || layoutNodes.length === 0) return null;
    
    const radiusExtent = d3.extent(layoutNodes, d => d.r) as [number, number];
    return d3.scaleLinear()
      .domain(radiusExtent)
      .range([10, 18])
      .clamp(true);
  }

  /**
   * Apply entrance animations consistently across all chart types
   */
  static applyEntranceAnimations(bubbleGroups: any, config: BubbleChartOptions): void {
    if (!config.animation?.enter) return;

    const { duration = 800, stagger = 50, delay = 0 } = config.animation.enter;

    // Animate circles
    bubbleGroups.selectAll('circle')
      .style('opacity', 0)
      .attr('r', 0)
      .transition()
      .delay((_d: any, i: number) => delay + i * stagger)
      .duration(duration)
      .style('opacity', 0.8)
      .attr('r', (d: any) => d.r);

    // Animate text labels
    bubbleGroups.selectAll('text')
      .style('opacity', 0)
      .transition()
      .delay((_d: any, i: number) => delay + i * stagger + duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);
  }

  /**
   * Render text labels with consistent sizing and formatting
   */
  static renderLabels(bubbleGroups: any, options: {
    radiusAccessor: (d: any) => number;
    labelAccessor: (d: any) => string;
    textColor: string;
    maxLength?: number;
    formatFunction?: ((text: string) => string) | undefined;
    initialOpacity?: number; 
  }): any {
    const {
      radiusAccessor,
      labelAccessor,
      textColor,
      maxLength = 20,
      formatFunction,
      initialOpacity = 1
    } = options;

    // Use proper data binding to prevent duplicates during re-renders
    return bubbleGroups.selectAll('text')
      .data((d: any) => [d]) // Bind each group to its own data
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-family', 'Arial, sans-serif')
      .style('font-weight', 'bold')
      .style('fill', textColor)
      .style('pointer-events', 'none')
      .style('opacity', initialOpacity)
      .text((d: any) => {
        let text = labelAccessor(d);
        if (formatFunction) {
          text = formatFunction(text);
        }
        return formatLabel(text, maxLength);
      })
      .style('font-size', (d: any) => {
        const radius = radiusAccessor(d);
        return ChartPipeline.calculateFontSize(radius);
      });
  }

  /**
   * Calculate appropriate font size based on bubble radius
   */
  static calculateFontSize(radius: number, radiusRange: [number, number] = [0, 100]): string {
    // Scale font size based on radius, with reasonable min/max bounds
    const minFontSize = 10;
    const maxFontSize = 18;
    
    // Normalize radius to 0-1 range
    const normalizedRadius = Math.max(0, Math.min(1, 
      (radius - radiusRange[0]) / (radiusRange[1] - radiusRange[0])
    ));
    
    // Apply square root scaling for better visual proportion
    const fontSize = minFontSize + (maxFontSize - minFontSize) * Math.sqrt(normalizedRadius);
    
    return `${Math.round(fontSize)}px`;
  }

  /**
   * Create radius scale for consistent bubble sizing
   */
  static createRadiusScale(processedData: ProcessedDataPoint[], range: [number, number] = [8, 50]): any {
    return createRadiusScale(
      processedData,
      d => d.size,
      range
    );
  }

  /**
   * Create force layout for motion charts
   */
  static createForceLayout(
    processedData: ProcessedDataPoint[], 
    dimensions: { width: number; height: number }
  ): any[] {
    // Create simple node structure for force simulation
    return processedData.map((d, i) => ({
      ...d,
      index: i,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      vx: 0,
      vy: 0
    }));
  }

  /**
   * Create clustered layout for grouped visualizations
   */
  static createClusteredLayout(
    processedData: ProcessedDataPoint[], 
    dimensions: { width: number; height: number },
    clusterField: string
  ): any[] {
    // Group data by cluster field
    const groups = d3.group(processedData, d => (d as any)[clusterField] || 'Other');
    const groupArray = Array.from(groups.entries());
    
    // Calculate positions for each cluster
    const angleStep = (2 * Math.PI) / groupArray.length;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const clusterRadius = Math.min(dimensions.width, dimensions.height) * 0.3;
    
    const result: any[] = [];
    groupArray.forEach(([groupName, groupData], groupIndex) => {
      const angle = groupIndex * angleStep;
      const groupCenterX = centerX + Math.cos(angle) * clusterRadius;
      const groupCenterY = centerY + Math.sin(angle) * clusterRadius;
      
      // Position items within each cluster
      groupData.forEach((item, itemIndex) => {
        const itemAngle = (itemIndex / groupData.length) * 2 * Math.PI;
        const itemRadius = 30; // Small radius for within-cluster positioning
        
        result.push({
          ...item,
          x: groupCenterX + Math.cos(itemAngle) * itemRadius,
          y: groupCenterY + Math.sin(itemAngle) * itemRadius,
          cluster: groupName
        });
      });
    });
    
    return result;
  }

  /**
   * Apply theme styling to SVG elements
   */
  static applyTheme(svgElements: SVGElements, theme: any): void {
    if (!theme || !svgElements) return;

    // Apply background color to container
    if (theme.background) {
      svgElements.svg
        .style('background-color', theme.background);
    }

    // Apply theme colors to existing elements if they exist
    if (svgElements.svg && theme.textColor) {
      svgElements.svg.selectAll('text')
        .style('fill', theme.textColor);
    }

    if (svgElements.svg && theme.strokeColor) {
      svgElements.svg.selectAll('circle')
        .style('stroke', theme.strokeColor);
    }
  }

  /**
   * Create key function for D3 data joins
   */
  static createKeyFunction(config: BubbleChartOptions): ((d: any) => string) | undefined {
    if (config.keyFunction) {
      return config.keyFunction as ((d: any) => string);
    }
    
    // Default key function based on label accessor
    if (typeof config.label === 'string') {
      return (d: any) => {
        const dataItem = d.data || d;
        return dataItem[config.label as string] || dataItem.label || JSON.stringify(dataItem);
      };
    }
    
    // For function accessors, use the label value
    return (d: any) => {
      const dataItem = d.data || d;
      return dataItem.label || JSON.stringify(dataItem);
    };
  }

  /**
   * Render bubble groups with consistent D3 patterns
   */
  static renderBubbleGroups(svg: any, nodes: any[], config: {
    keyFunction?: (d: any) => string;
    cssClass?: string;
    transform?: boolean;
  }): any {
    const { keyFunction, cssClass = 'bubble', transform = true } = config;

    // Handle multi-class CSS selectors properly (e.g. 'bubble-chart bubble' -> 'g.bubble-chart.bubble')
    const selector = `g.${cssClass.replace(/\s+/g, '.')}`;
    
    const selection = svg.selectAll(selector);
    
    const groups = selection
      .data(nodes, keyFunction)
      .join('g')
      .attr('class', cssClass)
      .attr('transform', transform ? (d: any) => `translate(${d.x || 0},${d.y || 0})` : null);
      
    return groups;
  }

  /**
   * Render circles with consistent styling
   */
  static renderCircles(groups: any, config: {
    radiusAccessor?: (d: any) => number;
    colorAccessor?: (d: any) => string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    initialRadius?: number | ((d: any) => number);
    initialOpacity?: number;
  }): any {
    const {
      radiusAccessor = (d: any) => d.r || 10,
      colorAccessor = () => '#1f77b4',
      strokeColor = '#fff',
      strokeWidth = 2,
      opacity = 0.8,
      initialRadius,
      initialOpacity
    } = config;

    // Use proper data binding to prevent duplicates during re-renders
    return groups.selectAll('circle')
      .data((d: any) => [d]) // Bind each group to its own data
      .join('circle')
      .attr('r', typeof initialRadius === 'function' ? initialRadius : (initialRadius || radiusAccessor))
      .style('fill', colorAccessor)
      .style('stroke', strokeColor)
      .style('stroke-width', strokeWidth)
      .style('opacity', initialOpacity !== undefined ? initialOpacity : opacity);
  }

  /**
   * Attach standard event handlers and user-defined event handlers
   */
  static attachStandardEvents(groups: any, interactionManager: any): void {
    // Attach user-defined event handlers first (click, mouseover, etc.)
    if (interactionManager && interactionManager.attachBubbleEvents) {
      // Get the processed data from the first group's data to pass to interaction manager
      const firstGroupData = groups.data();
      if (firstGroupData && firstGroupData.length > 0) {
        // Convert layout nodes back to processed data format for interaction manager
        const processedData = firstGroupData.map((d: any) => d.data || d);
        interactionManager.attachBubbleEvents(groups, processedData);
      }
    }

    // Add basic hover styling effects (non-conflicting with user events)
    groups
      .style('cursor', 'pointer')
      .on('mouseenter.styling', function(this: SVGGElement) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .style('opacity', 1)
          .attr('stroke-width', 3);
      })
      .on('mouseleave.styling', function(this: SVGGElement) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .style('opacity', 0.8)
          .attr('stroke-width', 2);
      });
  }

  /**
   * Wrap text for better readability
   */
  static wrapText(textSelection: any, width: number): void {
    wrapText(textSelection, width);
  }
} 