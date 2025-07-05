/**
 * SVG Management System
 * Centralized handling of SVG creation, sizing, and container management
 * Eliminates duplication across all chart builders
 */

import * as d3 from 'd3';
import type { BubbleChartOptions } from '../types/config.js';

export interface SVGDimensions {
  width: number;
  height: number;
}

export interface SVGElements {
  container: any;
  svg: any;
  mainGroup: any;
  dimensions: SVGDimensions;
}

/**
 * SVG Manager for consistent SVG setup across all chart types
 */
export class SVGManager {
  private elements?: SVGElements;

  /**
   * Initialize SVG elements with proper error handling and responsive sizing
   * @param config - Chart configuration
   * @returns SVG elements and dimensions
   */
  initialize(config: BubbleChartOptions): SVGElements {
    // Select and validate container
    const container = d3.select(config.container);
    if (container.empty()) {
      throw new Error(`Container "${config.container}" not found`);
    }

    // Clear existing content
    container.selectAll('*').remove();

    // Calculate responsive dimensions
    const dimensions = this.calculateDimensions(container, config);

    // Create SVG with proper attributes
    const svg = container
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .style('background', 'transparent')
      .style('overflow', 'visible');

    // Create main group for transformations
    const mainGroup = svg
      .append('g')
      .attr('class', 'bubble-chart-main');

    this.elements = {
      container,
      svg,
      mainGroup,
      dimensions
    };

    return this.elements;
  }

  /**
   * Calculate responsive dimensions with fallbacks
   * @param container - D3 selection of container element
   * @param config - Chart configuration
   * @returns Calculated dimensions
   */
  private calculateDimensions(
    container: any,
    config: BubbleChartOptions
  ): SVGDimensions {
    const containerNode = container.node() as HTMLElement;
    
    // Get container dimensions with fallbacks
    const containerWidth = containerNode?.clientWidth || 500;
    const containerHeight = containerNode?.clientHeight || 500;

    return {
      width: config.width || containerWidth,
      height: config.height || containerHeight
    };
  }

  /**
   * Get current SVG elements
   * @returns Current SVG elements or undefined if not initialized
   */
  getElements(): SVGElements | undefined {
    return this.elements;
  }

  /**
   * Update SVG dimensions
   * @param width - New width
   * @param height - New height
   */
  updateDimensions(width: number, height: number): void {
    if (!this.elements) {
      throw new Error('SVG Manager not initialized');
    }

    this.elements.dimensions = { width, height };
    this.elements.svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
  }

  /**
   * Add responsive behavior to SVG
   * @param callback - Function to call on resize
   */
  makeResponsive(callback?: (dimensions: SVGDimensions) => void): void {
    if (!this.elements) return;

    const container = this.elements.container;
    const resizeObserver = new ResizeObserver(() => {
      const containerNode = container.node() as HTMLElement;
      if (containerNode) {
        const width = containerNode.clientWidth;
        const height = containerNode.clientHeight;
        
        this.updateDimensions(width, height);
        callback?.(this.elements!.dimensions);
      }
    });

    const containerNode = container.node() as HTMLElement;
    if (containerNode) {
      resizeObserver.observe(containerNode);
    }
  }

  /**
   * Clean up SVG elements
   */
  destroy(): void {
    if (this.elements) {
      this.elements.container.selectAll('*').remove();
      this.elements = undefined!;
    }
  }
} 