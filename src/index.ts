// Pure D3-Native Bubble Chart Library

import * as d3 from 'd3';
import { BuilderFactory } from './builders/builder-factory.js';
import type { BubbleChartData, BubbleChartOptions } from './types/index.js';

/**
 * Simple D3-native chart wrapper that adds events directly to D3 selections
 */
class D3ChartWrapper {
  private config: Partial<BubbleChartOptions> = {};
  private chartData: BubbleChartData[] | any = null;
  private chartInstance: any = null;
  private eventHandlers: Map<string, Function> = new Map();
  private animationConfig: any = null;
  
  constructor(container: string) {
    this.config.container = container;
  }
  
  withData(data: BubbleChartData[] | any) {
    this.chartData = data;
    return this;
  }
  
  withLabel(label: string) {
    this.config.label = label;
    return this;
  }
  
  withSize(size: string) {
    this.config.size = size;
    return this;
  }
  
  withColor(color: string | ((d: any) => string)) {
    this.config.color = color;
    return this;
  }
  
  withType(type: string) {
    this.config.type = type as any;
    return this;
  }
  
  withDimensions(width: number, height: number) {
    this.config.width = width;
    this.config.height = height;
    return this;
  }
  
  withPercentage(fn: any) {
    this.config.percentage = fn;
    return this;
  }
  
  withKey(keyFn: (d: any) => string | number) {
    this.config.keyFunction = keyFn;
    return this;
  }
  
  withAnimations(preset: string | any) {
    // Simple D3-native animation presets
    if (preset === 'gentle' || preset === 'smooth') {
      this.animationConfig = {
        duration: 800,
        staggerDelay: 50,
        easing: 'ease-out'
      };
    } else if (preset === 'fast') {
      this.animationConfig = {
        duration: 400,
        staggerDelay: 20,
        easing: 'ease-out'
      };
    } else if (typeof preset === 'object') {
      this.animationConfig = preset;
    }
    return this;
  }
  
  /**
   * Build/render the chart using pure D3 patterns
   */
  build(): any {
    return this.render();
  }
  
  render(): any {
    const finalConfig = {
      container: this.config.container!,
      label: this.config.label || 'name',
      size: this.config.size || 'value',
      color: this.config.color,
      type: this.config.type || 'bubble',
      width: this.config.width,
      height: this.config.height,
      percentage: this.config.percentage,
      keyFunction: this.config.keyFunction, // 🔑 Pass key function to builder
      animation: this.animationConfig ? {
        enter: {
          duration: this.animationConfig.duration,
          stagger: this.animationConfig.staggerDelay
        },
        update: {
          duration: this.animationConfig.duration * 0.8
        },
        exit: {
          duration: this.animationConfig.duration * 0.5
        }
      } : undefined
    } as BubbleChartOptions;
    
    this.chartInstance = BuilderFactory.create(finalConfig);
    
    if (this.chartData) {
      this.chartInstance.data(this.chartData).update();
      
      // Attach pure D3 events after update
      this.attachEventsToD3Selection();
    }
    
      // Return chart interface
      return {
        update: (newData: any) => {
          // D3-native: just update data, no render() needed
          this.chartInstance.data(newData).update();
          // Re-attach events after update
          this.attachEventsToD3Selection();
        },
      
      on: (event: string, handler: Function) => {
        this.eventHandlers.set(event, handler);
        // If chart is already rendered, attach immediately
        if (this.chartInstance) {
          this.attachEventsToD3Selection();
        }
        return this;
      },
      
      getBuilder: () => this.chartInstance
    };
  }
  
  /**
   * Apply simple D3-native entrance animations
   */
  private applyD3Animations(): void {
    if (!this.animationConfig) return;
    
    const container = this.config.container;
    if (!container) return;
    
    const svg = d3.select(container).select('svg');
    const bubbleGroups = svg.selectAll('.bubble');
    
    if (bubbleGroups.empty()) {
      // Retry after a short delay if bubbles aren't ready yet
      setTimeout(() => this.applyD3Animations(), 50);
      return;
    }
    
    const { duration, staggerDelay } = this.animationConfig;
    
    // Animate circles with staggered entrance
    bubbleGroups.select('circle')
      .attr('r', 0)
      .style('opacity', 0)
      .transition()
      .delay((_d: any, i: number) => i * (staggerDelay || 50))
      .duration(duration || 800)
      .ease(d3.easeBackOut)
      .attr('r', function(d: any) {
        // Get the original radius from the data
        return d.r;
      })
      .style('opacity', 0.8);
    
    // Animate labels with slight delay
    bubbleGroups.select('text')
      .style('opacity', 0)
      .transition()
      .delay((_d: any, i: number) => i * (staggerDelay || 50) + 200)
      .duration((duration || 800) / 2)
      .ease(d3.easeBackOut)
      .style('opacity', 1);
  }
  
  /**
   * Pure D3 event attachment - no InteractionManager complexity
   */
  private attachEventsToD3Selection(): void {
    if (!this.chartInstance || this.eventHandlers.size === 0) return;
    
    // Find the SVG container and select all bubble groups
    const container = this.config.container;
    if (!container) return;
    
    const svg = d3.select(container).select('svg');
    const bubbleGroups = svg.selectAll('.bubble');
    
    if (bubbleGroups.empty()) {
      // Retry after a short delay if bubbles aren't ready yet
      setTimeout(() => this.attachEventsToD3Selection(), 50);
      return;
    }
    
    // Attach each registered event handler directly to D3 selection
    this.eventHandlers.forEach((handler, eventName) => {
      bubbleGroups.on(eventName, (event: any, d: any) => {
        // Handle different data structures from different chart types
        let eventData = d;
        
        // For pack layout (bubble, wave, tree charts), data is in d.data
        if (d && d.data) {
          eventData = d.data;
          
          // If the processed data has a nested 'data' property with original fields, use that
          if (eventData.data && typeof eventData.data === 'object') {
            eventData = eventData.data;
          }
        }
        
        // Call handler with the correct data structure
        handler(eventData, event, event.target);
      });
    });
  }
}

/**
 * Pure D3-native BubbleChart API
 */
export const BubbleChart = {
  create: (container: string) => new D3ChartWrapper(container)
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
export { MotionBubble } from './builders/motion-bubble.js';
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

// Make the D3-native API the default export
export default BubbleChart;
