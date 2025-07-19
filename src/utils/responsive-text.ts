/**
 * D3-Native Responsive Text and Layout Utilities
 * Provides responsive typography and layout management using D3 selections
 * Integrated with the bubble chart library's responsive system
 */

import * as d3 from 'd3';

export interface ResponsiveTextOptions {
  minSize?: number;
  maxSize?: number;
  baseWidth?: number;
  unit?: 'rem' | 'px' | 'em';
  scalingFactor?: number;
}

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

export interface ResponsiveTextConfig {
  selector: string;
  mobile: number;
  tablet: number;
  desktop: number;
  large?: number;
  unit?: string;
}

/**
 * D3-Native Responsive Text Management System
 */
export class ResponsiveTextManager {
  private breakpoints: ResponsiveBreakpoints = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1440
  };

  private resizeHandler?: () => void;
  private debounceTimer?: NodeJS.Timeout;

  /**
   * Calculate responsive font size based on viewport width
   * @param viewportWidth - Current viewport width
   * @param options - Sizing configuration
   * @returns Calculated font size
   */
  calculateFontSize(viewportWidth: number, options: ResponsiveTextOptions = {}): number {
    const {
      minSize = 0.8,
      maxSize = 3,
      baseWidth = 1200,
      scalingFactor = 1
    } = options;

    // Calculate responsive ratio
    const ratio = Math.min(Math.max(viewportWidth / baseWidth, 0.4), 1.6);
    const calculatedSize = minSize + (maxSize - minSize) * ratio * scalingFactor;
    
    return Math.max(minSize, Math.min(maxSize, calculatedSize));
  }

  /**
   * Get current breakpoint based on viewport width
   * @param viewportWidth - Current viewport width
   * @returns Current breakpoint name
   */
  getCurrentBreakpoint(viewportWidth: number): keyof ResponsiveBreakpoints {
    if (viewportWidth < this.breakpoints.mobile) return 'mobile';
    if (viewportWidth < this.breakpoints.tablet) return 'tablet';
    if (viewportWidth < this.breakpoints.desktop) return 'desktop';
    return 'large';
  }

  /**
   * Apply responsive font size to a D3 selection
   * @param selection - D3 selection to update
   * @param viewportWidth - Current viewport width
   * @param options - Sizing configuration
   */
  applyResponsiveFontSize(
    selection: d3.Selection<any, any, any, any>,
    viewportWidth: number,
    options: ResponsiveTextOptions = {}
  ): void {
    const { unit = 'rem' } = options;
    const fontSize = this.calculateFontSize(viewportWidth, options);
    selection.style('font-size', `${fontSize}${unit}`);
  }

  /**
   * Apply breakpoint-based font sizes
   * @param selection - D3 selection to update
   * @param config - Breakpoint configuration
   */
  applyBreakpointFontSize(
    selection: d3.Selection<any, any, any, any>,
    config: ResponsiveTextConfig
  ): void {
    const viewportWidth = window.innerWidth;
    const breakpoint = this.getCurrentBreakpoint(viewportWidth);
    const unit = config.unit || 'rem';
    
    const sizeMap = {
      mobile: config.mobile,
      tablet: config.tablet,
      desktop: config.desktop,
      large: config.large || config.desktop
    };
    
    const fontSize = sizeMap[breakpoint];
    selection.style('font-size', `${fontSize}${unit}`);
  }

  /**
   * Set up responsive text behavior for multiple elements
   * @param configs - Array of text configurations
   * @param debounceMs - Debounce delay for resize events
   */
  setupResponsiveText(configs: ResponsiveTextConfig[], debounceMs: number = 200): void {
    const updateAllText = () => {
      configs.forEach(config => {
        const selection = d3.selectAll(config.selector);
        if (!selection.empty()) {
          this.applyBreakpointFontSize(selection, config);
        }
      });
    };

    // Initial update
    updateAllText();

    // Set up resize handler with debouncing
    this.resizeHandler = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(updateAllText, debounceMs);
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Apply responsive spacing (margins, padding)
   * @param selection - D3 selection to update
   * @param property - CSS property ('margin', 'padding', etc.)
   * @param sizes - Responsive size configuration
   */
  applyResponsiveSpacing(
    selection: d3.Selection<any, any, any, any>,
    property: string,
    sizes: { mobile: string; tablet: string; desktop: string; large?: string }
  ): void {
    const viewportWidth = window.innerWidth;
    const breakpoint = this.getCurrentBreakpoint(viewportWidth);
    
    const sizeMap = {
      mobile: sizes.mobile,
      tablet: sizes.tablet,
      desktop: sizes.desktop,
      large: sizes.large || sizes.desktop
    };
    
    selection.style(property, sizeMap[breakpoint]);
  }

  /**
   * Create responsive container with D3-managed dimensions
   * @param selector - Container selector
   * @param options - Container options
   */
  createResponsiveContainer(
    selector: string,
    options: {
      maxWidth?: { mobile: string; tablet: string; desktop: string };
      padding?: { mobile: string; tablet: string; desktop: string };
      background?: string;
      borderRadius?: string;
    } = {}
  ): d3.Selection<any, any, any, any> {
    const container = d3.select(selector);
    
    if (container.empty()) {
      throw new Error(`Container "${selector}" not found`);
    }

    // Apply base styles
    container
      .style('margin', '0 auto')
      .style('box-sizing', 'border-box');

    if (options.background) {
      container.style('background', options.background);
    }
    
    if (options.borderRadius) {
      container.style('border-radius', options.borderRadius);
    }

    // Apply responsive dimensions
    if (options.maxWidth) {
      this.applyResponsiveSpacing(container, 'max-width', options.maxWidth);
    }
    
    if (options.padding) {
      this.applyResponsiveSpacing(container, 'padding', options.padding);
    }

    return container;
  }

  /**
   * Cleanup resize handlers
   */
  destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      delete this.resizeHandler;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      delete this.debounceTimer;
    }
  }
}

/**
 * Global responsive text manager instance
 */
export const responsiveText = new ResponsiveTextManager();

/**
 * Utility functions for common responsive text patterns
 */
export const ResponsiveTextUtils = {
  /**
   * Set up responsive headings (h1, h2, h3, etc.)
   */
  setupResponsiveHeadings(): void {
    responsiveText.setupResponsiveText([
      { selector: 'h1', mobile: 1.8, tablet: 2.2, desktop: 2.5, large: 3, unit: 'rem' },
      { selector: 'h2', mobile: 1.4, tablet: 1.6, desktop: 1.8, large: 2, unit: 'rem' },
      { selector: 'h3', mobile: 1.2, tablet: 1.3, desktop: 1.4, large: 1.6, unit: 'rem' },
      { selector: '.subtitle', mobile: 0.9, tablet: 1, desktop: 1.1, large: 1.2, unit: 'rem' },
      { selector: '.info-text', mobile: 0.8, tablet: 0.85, desktop: 0.9, large: 1, unit: 'rem' }
    ]);
  },

  /**
   * Create responsive page layout
   */
  createResponsivePage(containerSelector: string): d3.Selection<any, any, any, any> {
    // Set up body styles
    d3.select('body')
      .style('margin', '0')
      .style('font-family', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif')
      .style('line-height', '1.6');

    // Create responsive container
    const container = responsiveText.createResponsiveContainer(containerSelector, {
      maxWidth: { mobile: '95%', tablet: '90%', desktop: '1200px' },
      padding: { mobile: '15px', tablet: '25px', desktop: '30px' },
      background: 'white',
      borderRadius: '12px'
    });

    // Apply responsive spacing to body
    responsiveText.applyResponsiveSpacing(
      d3.select('body'),
      'padding',
      { mobile: '10px', tablet: '15px', desktop: '20px' }
    );

    return container;
  },

  /**
   * Cleanup all responsive text behaviors
   */
  cleanup(): void {
    responsiveText.destroy();
  }
};

export default ResponsiveTextManager;
