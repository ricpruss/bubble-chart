// Pure D3-Native Bubble Chart Library

import * as d3 from 'd3';
import { BuilderFactory } from './builders/builder-factory.js';
import type { BubbleChartData, BubbleChartOptions } from './types/index.js';
import { D3DataUtils } from './d3/index.js';
import { SimplifiedChartOptions, createDefaultOptions, migrateConfig } from './config/simple-config.js';

/**
 * Simple D3-native chart wrapper that adds events directly to D3 selections
 */
/**
 * Simplified fluent API builder that directly uses builders without wrapper overhead
 */
class D3FluentBuilder {
  private config: Partial<BubbleChartOptions> & { data?: BubbleChartData[] } = {};
  private chartInstance: any = null;
  private eventHandlers: Map<string, Function> = new Map();
  
  constructor(container: string) {
    this.config.container = container;
  }
  
  withData(data: BubbleChartData[]): this {
    // Store data and auto-render if we have enough config
    this.config.data = data;
    this.autoRenderIfReady();
    return this;
  }
  
  withLabel(label: string): this {
    this.config.label = label;
    return this;
  }
  
  withSize(size: string): this {
    this.config.size = size;
    return this;
  }
  
  withColor(color: string | ((d: any) => string)): this {
    this.config.color = color;
    return this;
  }
  
  withType(type: string): this {
    this.config.type = type as any;
    return this;
  }
  
  withDimensions(width: number, height: number): this {
    this.config.width = width;
    this.config.height = height;
    return this;
  }
  
  withPercentage(fn: any): this {
    this.config.percentage = fn;
    return this;
  }
  
  withKey(keyFn: (d: any) => string | number): this {
    this.config.keyFunction = keyFn;
    return this;
  }
  
  withTheme(theme: 'corporate' | 'ocean' | 'sunset' | 'forest' | 'slate' | 'wave'): this {
    this.config.theme = theme;
    return this;
  }
  
  withAnimations(preset: string | any): this {
    // Convert preset to animation config
    if (preset === 'gentle' || preset === 'smooth') {
      this.config.animation = {
        enter: { duration: 800, stagger: 50, easing: 'ease-out' },
        update: { duration: 640, easing: 'ease-in-out' },
        exit: { duration: 400, easing: 'ease-in' }
      };
    } else if (preset === 'fast') {
      this.config.animation = {
        enter: { duration: 400, stagger: 20, easing: 'ease-out' },
        update: { duration: 320, easing: 'ease-in-out' },
        exit: { duration: 200, easing: 'ease-in' }
      };
    } else if (typeof preset === 'object') {
      this.config.animation = preset;
    }
    return this;
  }

  /**
   * Enhanced tooltip configuration (supports function for custom tooltips)
   */
  withTooltips(tooltipConfig: boolean | string[] | ((d: any) => any[])): this {
    this.config.tooltip = tooltipConfig;
    return this;
  }

  /**
   * Time field for motion charts
   */
  withTime(timeField: string): this {
    this.config.time = timeField;
    return this;
  }

  /**
   * Enable streaming data updates
   */
  withStreaming(options?: any): this {
    this.config.keyFunction = options?.keyFunction || ((d: any) => d.id || d.name);
    if (options?.enterAnimation) {
      this.config.animation = {
        enter: options.enterAnimation,
        update: options.updateAnimation || { duration: 600, easing: 'ease-in-out' },
        exit: options.exitAnimation || { duration: 400, easing: 'ease-in' }
      };
    }
    return this;
  }

  /**
   * Enable grouping by field
   */
  withGrouping(groupField: string): this {
    this.config.colour = groupField;
    return this;
  }
  
  /**
   * Enable interactive filtering - clicking bubbles spatially separates by group
   */
  withInteractiveFiltering(enabled: boolean = true): this {
    this.config.interactiveFiltering = enabled;
    return this;
  }
  
  /**
   * Enable responsive behavior with optional constraints
   * @param options - Responsive configuration options
   */
  withResponsive(options: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    maintainAspectRatio?: boolean;
    debounceMs?: number;
    onResize?: (dimensions: { width: number; height: number }) => void;
  } = {}): this {
    this.config.responsive = options;
    return this;
  }

  // Note: Density and force controls moved to MotionBubble
  // Use .withType('motion') for sophisticated continuous force animation
  
  /**
   * Build the chart - creates builder instance and renders if data is available
   */
  build(): ChartInterface {
    this.createBuilderInstance();
    
    if (this.config.data) {
      this.chartInstance.data(this.config.data).update();
      this.attachEvents();
    }
    
    return {
      update: (newData: any) => {
        if (this.chartInstance) {
          this.chartInstance.data(newData).update();
          this.attachEvents();
        }
      },
      updateData: (newData: any) => {
        if (this.chartInstance && this.chartInstance.updateData) {
          this.chartInstance.updateData(newData);
        } else if (this.chartInstance) {
          this.chartInstance.data(newData).update();
        }
        this.attachEvents();
      },
      on: (event: string, handler: Function) => {
        this.eventHandlers.set(event, handler);
        if (this.chartInstance) {
          this.attachEvents();
        }
        return this;
      },
      onBubble: (event: string, handler: Function) => {
        this.eventHandlers.set(event, handler);
        if (this.chartInstance) {
          this.attachEvents();
        }
        return this;
      },
      getBuilder: () => this.chartInstance,
      makeResponsive: (options?: any) => {
        if (this.chartInstance && this.chartInstance.svgManager) {
          return this.chartInstance.svgManager.makeResponsive(options);
        }
      },
      setResponsiveOptions: (options: any) => {
        if (this.chartInstance && this.chartInstance.svgManager) {
          this.chartInstance.svgManager.setResponsiveOptions(options);
        }
      },
      forceResponsiveUpdate: () => {
        if (this.chartInstance && this.chartInstance.svgManager) {
          this.chartInstance.svgManager.forceResponsiveUpdate();
        }
      },
      store: {
        add: (item: any) => {
          // Add to current data and update
          if (this.config.data) {
            this.config.data.push(item);
            if (this.chartInstance) {
              this.chartInstance.data(this.config.data).update();
              this.attachEvents();
            }
          }
        },
        remove: (key: string) => {
          // Remove from current data and update
          if (this.config.data && this.config.keyFunction) {
            this.config.data = this.config.data.filter(d => 
              this.config.keyFunction!(d) !== key
            );
            if (this.chartInstance) {
              this.chartInstance.data(this.config.data).update();
              this.attachEvents();
            }
          }
        },
        clear: () => {
          // Clear all data
          this.config.data = [];
          if (this.chartInstance) {
            this.chartInstance.data(this.config.data).update();
            this.attachEvents();
          }
        }
      },
      // Force layout runtime methods (NEW)
      setDensity: (preset: 'sparse' | 'balanced' | 'dense' | 'compact') => {
        if (this.chartInstance && this.chartInstance.shouldUseForceLayout && this.chartInstance.shouldUseForceLayout()) {
          // Update the config
          console.log('setDensity: Use MotionBubble for density controls');
          
          // Call the builder's setDensity method directly
          if (this.chartInstance.setDensity) {
            this.chartInstance.setDensity(preset);
          } else {
            console.warn('ChartInterface.setDensity: Builder does not have setDensity method');
          }
        } else {
          console.warn('ChartInterface.setDensity: Not using force layout or chart instance not available');
        }
      },
      updateRadius: (nodeId: string, newRadius: number) => {
        if (this.chartInstance && this.chartInstance.updateRadius) {
          // Call the builder's updateRadius method
          this.chartInstance.updateRadius(nodeId, newRadius);
        } else if (this.chartInstance && this.chartInstance.radiusHandler) {
          // Use the radiusHandler directly
          this.chartInstance.radiusHandler.updateRadius([{
            id: nodeId,
            radius: newRadius,
            duration: 300
          }]);
        }
      },
      // NEW: Runtime force configuration updates (fluent pattern)
      setForces: (forces: any) => {
        if (this.chartInstance && this.chartInstance.shouldUseForceLayout && this.chartInstance.shouldUseForceLayout()) {
          // Update the config
          console.log('setForces: Use MotionBubble for force controls');
          
          // Call the builder's setForces method
          if (this.chartInstance.setForces) {
            this.chartInstance.setForces(forces);
          } else {
            console.warn('ChartInterface.setForces: Builder does not have setForces method');
          }
        } else {
          console.warn('ChartInterface.setForces: Not using force layout or chart instance not available');
        }
      }
    };
  }

  
  /**
   * Auto-render when we have enough configuration
   */
  private autoRenderIfReady(): void {
    if (this.config.data && this.config.container && this.config.label && this.config.size) {
      // We have enough to render, but user still needs to call build()
      // This just prepares everything
    }
  }
  
  /**
   * Create builder instance with final configuration
   */
  private createBuilderInstance(): void {
    const finalConfig: BubbleChartOptions = {
      container: this.config.container!,
      label: this.config.label || 'name',
      size: this.config.size || 'value',
      type: this.config.type || 'none',
      ...(this.config.color && { color: this.config.color }),
      ...(this.config.width && { width: this.config.width }),
      ...(this.config.height && { height: this.config.height }),
      ...(this.config.percentage && { percentage: this.config.percentage }),
      ...(this.config.theme && { theme: this.config.theme }),
      ...(this.config.keyFunction && { keyFunction: this.config.keyFunction }),
      ...(this.config.animation && { animation: this.config.animation }),
      ...(this.config.interactiveFiltering && { interactiveFiltering: this.config.interactiveFiltering }),
      ...(this.config.colour && { colour: this.config.colour }),
      ...(this.config.responsive && { responsive: this.config.responsive }),
      // Note: Force layout configuration handled by MotionBubble
    };
    
    this.chartInstance = BuilderFactory.create(finalConfig);
  }
  
  /**
   * Attach event handlers directly to D3 selections
   */
  private attachEvents(): void {
    if (!this.chartInstance || this.eventHandlers.size === 0) return;
    
    const container = d3.select(this.config.container!);
    const bubbleGroups = container.selectAll('.bubble');
    
    if (bubbleGroups.empty()) {
      setTimeout(() => this.attachEvents(), 50);
      return;
    }
    
    this.eventHandlers.forEach((handler, eventName) => {
      bubbleGroups.on(eventName, (event: any, d: any) => {
        let eventData = d;
        if (d && d.data) {
          eventData = d.data;
          if (eventData.data && typeof eventData.data === 'object') {
            eventData = eventData.data;
          }
        }
        handler(eventData, event, event.target);
      });
    });
  }
}

/**
 * Chart interface returned by build()
 */
interface ChartInterface {
  update: (newData: any) => void;
  updateData: (newData: any) => void;
  on: (event: string, handler: Function) => any;
  onBubble: (event: string, handler: Function) => any;
  getBuilder: () => any;
  makeResponsive: (options?: any) => void;
  setResponsiveOptions: (options: any) => void;
  forceResponsiveUpdate: () => void;
  store: {
    add: (item: any) => void;
    remove: (key: string) => void;
    clear: () => void;
  };
  // Force layout methods (NEW)
  updateRadius?: (nodeId: string, newRadius: number) => void;
  setDensity?: (preset: 'sparse' | 'balanced' | 'dense' | 'compact') => void;
  setForces?: (forces: any) => void;
}

/**
 * Simplified BubbleChart API with direct builder usage
 */
export const BubbleChart = {
  create: (container: string) => new D3FluentBuilder(container),
  
  /**
   * Alternative API for advanced users who want to use simplified configuration directly
   */
  createWith: (config: Partial<SimplifiedChartOptions>) => {
    const defaults = createDefaultOptions();
    const finalConfig = { ...defaults, ...config };
    
    // Convert to old format for backward compatibility
    const oldConfig = migrateConfig(finalConfig);
    const builder = BuilderFactory.create(oldConfig as BubbleChartOptions);
    
    return {
      update: (data: BubbleChartData[]) => {
        builder.data(data).update();
        return builder;
      },
      builder
    };
  }
};

// Export BuilderFactory for advanced usage
export { BuilderFactory } from './builders/builder-factory.js';

// Export core building blocks for advanced usage
export {
  SVGManager,
  DataProcessor,
  InteractionManager,
  RenderingPipeline,
  BaseChartBuilder,
  type SVGElements,
  type SVGDimensions,
  type ProcessedDataPoint,
  type TooltipManager,
  type RenderingContext,
  type LayoutNode
} from './core/index.js';

// Re-export individual builders for advanced usage
export { BubbleBuilder } from './builders/bubble-builder.js';
export { TreeBuilder } from './builders/tree-builder.js';
// export { MotionBubble } from './builders/motion-bubble.js'; // Temporarily disabled for force layout migration
export { WaveBubble } from './builders/wave-bubble.js';
export { LiquidBubble } from './builders/liquid-bubble.js';
export { OrbitBuilder } from './builders/orbit-builder.js';
export { ListBuilder } from './builders/list-builder.js';

// Re-export key types for external usage
export type {
  BubbleChartData,
  BubbleChartOptions,
  ChartType,
  BubbleEventType,
  BubbleEventHandlers
} from './types/index.js';

// Export simplified configuration types
export type {
  SimplifiedChartOptions,
  CoreChartOptions,
  SpecializedOptions,
  AnimationOptions
} from './config/simple-config.js';

export { createDefaultOptions, migrateConfig, validateConfig } from './config/simple-config.js';

// Export color palettes for custom styling
export {
  D3DataUtils
} from './d3/index.js';

// Export responsive text utilities
export {
  ResponsiveTextManager,
  responsiveText,
  ResponsiveTextUtils,
  type ResponsiveTextOptions,
  type ResponsiveBreakpoints,
  type ResponsiveTextConfig
} from './utils/responsive-text.js';

// Export themed palettes for advanced usage
export const THEMED_PALETTES = D3DataUtils.THEMED_PALETTES;

// Make the D3-native API the default export
export default BubbleChart;
