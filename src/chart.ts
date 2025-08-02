/**
 * D3-Native Fluent Chart API
 * Clean, composable interface following D3 conventions
 * Extracted from complex index.ts for better organization
 */

// D3 not directly used in this file, imported by builders
import { BuilderFactory } from './builders/builder-factory.js';
import type { BubbleChartData, BubbleChartOptions } from './types.js';

/**
 * Fluent chart builder following D3 patterns
 * Provides clean, chainable API for creating bubble charts
 */
class BubbleChartBuilder {
  private config: Partial<BubbleChartOptions> & { data?: BubbleChartData[] } = {};
  private chartInstance: any = null;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(container: string) {
    this.config.container = container;
  }

  /**
   * Set chart data - auto-renders if ready
   */
  withData(data: BubbleChartData[]): this {
    this.config.data = data;
    this.autoRenderIfReady();
    return this;
  }

  /**
   * Set label accessor
   */
  withLabel(label: string): this {
    this.config.label = label;
    return this;
  }

  /**
   * Set size accessor
   */
  withSize(size: string): this {
    this.config.size = size;
    return this;
  }

  /**
   * Set color configuration
   */
  withColor(color: string | ((d: any) => string)): this {
    this.config.color = color;
    return this;
  }

  /**
   * Set chart type
   */
  withType(type: string): this {
    this.config.type = type as any;
    return this;
  }

  /**
   * Set chart dimensions
   */
  withDimensions(width: number, height: number): this {
    this.config.width = width;
    this.config.height = height;
    return this;
  }

  /**
   * Set percentage function for wave/liquid charts
   */
  withPercentage(fn: (d: any) => number): this {
    this.config.percentage = fn;
    return this;
  }

  /**
   * Set key function for data joins
   */
  withKey(keyFn: (d: any) => string | number): this {
    this.config.keyFunction = keyFn;
    return this;
  }

  /**
   * Set theme
   */
  withTheme(theme: 'corporate' | 'ocean' | 'sunset' | 'forest' | 'slate' | 'wave'): this {
    this.config.theme = theme;
    return this;
  }

  /**
   * Set animation configuration
   */
  withAnimations(config: any): this {
    if (typeof config === 'string') {
      // Preset animations
      const presets = {
        'smooth': { enter: { duration: 800, stagger: 50 }, update: { duration: 600 }, exit: { duration: 400 } },
        'fast': { enter: { duration: 400, stagger: 25 }, update: { duration: 300 }, exit: { duration: 200 } },
        'slow': { enter: { duration: 1200, stagger: 100 }, update: { duration: 900 }, exit: { duration: 600 } }
      };
      this.config.animation = presets[config as keyof typeof presets] || presets.smooth;
    } else {
      this.config.animation = config;
    }
    return this;
  }

  /**
   * Set tooltip configuration
   */
  withTooltips(tooltipConfig: boolean | string[] | ((d: any) => any[])): this {
    this.config.tooltip = tooltipConfig;
    return this;
  }

  /**
   * Set time field for temporal charts
   */
  withTime(timeField: string): this {
    this.config.time = timeField;
    return this;
  }

  /**
   * Enable streaming updates (stored as animation config)
   */
  withStreaming(options: any = {}): this {
    // Convert streaming config to animation config
    const defaultConfig = {
      enter: { duration: 600, stagger: 50 },
      exit: { duration: 400 },
      update: { duration: 300 }
    };
    
    this.config.animation = { ...defaultConfig, ...options };
    return this;
  }

  /**
   * Set grouping field for spatial filtering
   */
  withGrouping(groupField: string): this {
    this.config.colour = groupField;
    return this;
  }

  /**
   * Enable interactive filtering
   */
  withInteractiveFiltering(enabled: boolean = true): this {
    this.config.interactiveFiltering = enabled;
    return this;
  }

  /**
   * Set responsive configuration
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
    this.config.responsive = {
      debounceMs: 200,
      maintainAspectRatio: false,
      ...options
    };
    return this;
  }

  /**
   * Build and return the chart instance
   */
  build(): ChartInterface {
    // Validate required config
    if (!this.config.container || !this.config.label || !this.config.size) {
      throw new Error('BubbleChart: container, label, and size are required');
    }

    // Create builder instance
    this.createBuilderInstance();

    // Set up data if provided
    if (this.config.data) {
      this.chartInstance.data(this.config.data).update();
    }

    // Attach events
    this.attachEvents();

    // Return chart interface
    return {
      update: (newData: any) => {
        if (this.chartInstance) {
          this.chartInstance.data(newData).update();
          this.attachEvents(); // Re-attach events after update
        }
      },
      updateData: (newData: any) => {
        this.config.data = newData;
        if (this.chartInstance) {
          this.chartInstance.data(newData).update();
          this.attachEvents();
        }
      },
      on: (event: string, handler: Function) => {
        this.eventHandlers.set(event, handler);
        if (this.chartInstance) {
          this.chartInstance.on(event, handler);
        }
        return this;
      },
      onBubble: (event: string, handler: Function) => {
        this.eventHandlers.set(`bubble-${event}`, handler);
        if (this.chartInstance) {
          this.chartInstance.on(event, handler);
        }
        return this;
      },
      getBuilder: () => this.chartInstance,
      makeResponsive: (options?: any) => {
        if (this.chartInstance && this.chartInstance.svgManager) {
          this.chartInstance.svgManager.makeResponsive(options);
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
          if (!this.config.data) this.config.data = [];
          if (this.config.keyFunction) {
            // Remove existing item with same key
            const key = this.config.keyFunction(item);
            this.config.data = this.config.data.filter(d => 
              this.config.keyFunction!(d) !== key
            );
          }
          this.config.data.push(item);
          if (this.chartInstance) {
            this.chartInstance.data(this.config.data).update();
            this.attachEvents();
          }
        },
        remove: (key: string) => {
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
          this.config.data = [];
          if (this.chartInstance) {
            this.chartInstance.data(this.config.data).update();
            this.attachEvents();
          }
        }
      },
      // Motion chart specific methods
      updateRadius: (nodeId: string, newRadius: number) => {
        if (this.chartInstance && typeof this.chartInstance.updateRadius === 'function') {
          this.chartInstance.updateRadius(nodeId, newRadius);
        }
      },
      setDensity: (preset: 'sparse' | 'balanced' | 'dense' | 'compact') => {
        if (this.chartInstance && typeof this.chartInstance.setDensity === 'function') {
          this.chartInstance.setDensity(preset);
        }
      }
    };
  }

  /**
   * Auto-render when we have sufficient configuration
   */
  private autoRenderIfReady(): void {
    if (this.config.container && this.config.label && this.config.size && this.config.data) {
      // We have the minimum required config, create instance if needed
      if (!this.chartInstance) {
        this.createBuilderInstance();
      }
    }
  }

  /**
   * Create the appropriate builder instance
   */
  private createBuilderInstance(): void {
    if (!this.config.container || !this.config.label || !this.config.size) {
      return;
    }

    // Create complete config
    const completeConfig = {
      container: this.config.container,
      label: this.config.label,
      size: this.config.size,
      type: this.config.type || 'bubble',
      ...this.config
    } as BubbleChartOptions;

    // Create builder using factory
    this.chartInstance = BuilderFactory.create(completeConfig);
  }

  /**
   * Attach event handlers to chart instance
   */
  private attachEvents(): void {
    if (!this.chartInstance) return;

    this.eventHandlers.forEach((handler, event) => {
      if (event.startsWith('bubble-')) {
        const bubbleEvent = event.replace('bubble-', '');
        this.chartInstance.on(bubbleEvent, handler);
      } else {
        this.chartInstance.on(event, handler);
      }
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
  updateRadius?: (nodeId: string, newRadius: number) => void;
  setDensity?: (preset: 'sparse' | 'balanced' | 'dense' | 'compact') => void;
}

/**
 * Main D3-style chart factory
 */
export const BubbleChart = {
  /**
   * Create a new bubble chart
   * @param container - CSS selector or DOM element
   * @returns Fluent chart builder
   */
  create(container: string): BubbleChartBuilder {
    return new BubbleChartBuilder(container);
  }
}; 