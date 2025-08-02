/**
 * SVG Management System
 * Centralized handling of SVG creation, sizing, and container management
 * Eliminates duplication across all chart builders
 */

import * as d3 from 'd3';
import type { BubbleChartOptions } from '../types.js';

export interface SVGDimensions {
  width: number;
  height: number;
}

export interface ResponsiveOptions {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  maintainAspectRatio?: boolean;
  debounceMs?: number;
  onResize?: (dimensions: SVGDimensions) => void;
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
  private resizeObserver?: ResizeObserver | undefined;
  private responsiveOptions?: ResponsiveOptions | undefined;
  private resizeTimer?: NodeJS.Timeout | undefined;
  private originalConfig?: BubbleChartOptions;

  /**
   * Initialize SVG elements with proper error handling and responsive sizing
   * @param config - Chart configuration
   * @returns SVG elements and dimensions
   */
  initialize(config: BubbleChartOptions): SVGElements {
    // Store original config for resize calculations
    this.originalConfig = config;
    
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
      .style('background', 'transparent');

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
   * Calculate responsive dimensions with fallbacks and responsive constraints
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
    const containerRect = containerNode?.getBoundingClientRect();
    const containerWidth = containerRect?.width || containerNode?.clientWidth || 500;
    const containerHeight = containerRect?.height || containerNode?.clientHeight || 500;

    // Apply responsive constraints if options are available
    const responsive = this.responsiveOptions || {};
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Calculate base dimensions
    let width = config.width || containerWidth;
    let height = config.height || containerHeight;

    // Apply responsive constraints
    const minWidth = responsive.minWidth || 320;
    const maxWidth = responsive.maxWidth || containerWidth; // Use full container width by default
    const minHeight = responsive.minHeight || 240;
    const maxHeight = responsive.maxHeight || containerHeight; // Use full container height by default

    width = Math.max(minWidth, Math.min(maxWidth, width));
    height = Math.max(minHeight, Math.min(maxHeight, height));

    // Apply aspect ratio constraints
    if (responsive.aspectRatio && responsive.maintainAspectRatio) {
      const ratio = responsive.aspectRatio;
      const currentRatio = width / height;
      
      if (currentRatio > ratio) {
        width = height * ratio;
      } else {
        height = width / ratio;
      }
    }

    // Apply mobile-specific adjustments
    if (viewportWidth < 768) {
      width = Math.min(width, viewportWidth - 40); // 20px padding on each side
      height = Math.min(height, viewportHeight * 0.6); // Max 60% of viewport height on mobile
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
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
   * Add responsive behavior to SVG with comprehensive options
   * @param options - Responsive configuration options
   * @param callback - Function to call on resize (deprecated, use options.onResize)
   */
  makeResponsive(options?: ResponsiveOptions | ((dimensions: SVGDimensions) => void), callback?: (dimensions: SVGDimensions) => void, rerenderCallback?: () => void): void {
    if (!this.elements) return;

    // Handle legacy callback parameter
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    this.responsiveOptions = options || {};
    const debounceMs = this.responsiveOptions.debounceMs || 250;
    const onResize = this.responsiveOptions.onResize || callback;

    const container = this.elements.container;
    const containerNode = container.node() as HTMLElement;
    
    if (!containerNode) return;

    // Create debounced resize handler
    const handleResize = () => {
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      
      this.resizeTimer = setTimeout(() => {
        if (!this.elements) return;
        
        const containerNode = container.node() as HTMLElement;
        if (containerNode && this.originalConfig) {
          // Recalculate dimensions with original responsive constraints
          const newDimensions = this.calculateDimensions(container, this.originalConfig);
          
          this.updateDimensions(newDimensions.width, newDimensions.height);
          onResize?.(this.elements.dimensions);
          
          // Trigger chart re-render with new dimensions
          if (rerenderCallback) {
            rerenderCallback();
          }
        }
      }, debounceMs);
    };

    // Use ResizeObserver for modern browsers
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(handleResize);
      this.resizeObserver.observe(containerNode);
    } else {
      // Fallback to window resize for older browsers
      window.addEventListener('resize', handleResize);
    }
  }

  /**
   * Set responsive options without triggering immediate resize
   * @param options - Responsive configuration options
   */
  setResponsiveOptions(options: ResponsiveOptions): void {
    this.responsiveOptions = { ...this.responsiveOptions, ...options };
  }

  /**
   * Get current responsive options
   * @returns Current responsive options
   */
  getResponsiveOptions(): ResponsiveOptions | undefined {
    return this.responsiveOptions;
  }

  /**
   * Force a responsive recalculation
   */
  forceResponsiveUpdate(): void {
    if (!this.elements || !this.originalConfig) return;
    
    const container = this.elements.container;
    const newDimensions = this.calculateDimensions(container, this.originalConfig);
    
    this.updateDimensions(newDimensions.width, newDimensions.height);
    this.responsiveOptions?.onResize?.(this.elements.dimensions);
  }

  /**
   * Check if the chart is currently responsive
   * @returns True if responsive behavior is enabled
   */
  isResponsive(): boolean {
    return !!this.resizeObserver;
  }

  /**
   * Clean up SVG elements and responsive observers
   */
  destroy(): void {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      delete this.resizeObserver;
    }
    
    // Clean up resize timer
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      delete this.resizeTimer;
    }
    
    // Clean up elements
    if (this.elements) {
      this.elements.container.selectAll('*').remove();
      this.elements = undefined!;
    }
    
    // Clean up responsive options
    delete this.responsiveOptions;
  }
} 