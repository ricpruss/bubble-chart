/**
 * Interaction Management System
 * Centralized handling of events, tooltips, and user interactions
 * Eliminates duplication across all chart builders
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions, TooltipItem } from '../config/index.js';
import type { BubbleEventHandlers, DataEventHandler } from '../events/index.js';
// import { createD3EventHandler } from '../config/events.js';
import type { ProcessedDataPoint } from './data-processor.js';

export interface TooltipManager {
  show(event: MouseEvent, data: any, items: TooltipItem[]): void;
  hide(): void;
  update(event: MouseEvent, items: TooltipItem[]): void;
  destroy(): void;
}

/**
 * Interaction manager for consistent event handling across all chart types
 */
export class InteractionManager<T extends BubbleChartData = BubbleChartData> {
  private tooltip?: TooltipManager;
  private eventHandlers: Partial<BubbleEventHandlers<T>> = {};

  constructor(
    private config: BubbleChartOptions,
    private svg: any
  ) {
    if (this.config.tooltip) {
      this.tooltip = this.createTooltipManager();
    }
  }

  /**
   * Register event handlers for the chart
   * @param handlers - Event handlers object
   */
  registerEventHandlers(handlers: Partial<BubbleEventHandlers<T>>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Attach interaction events to bubble elements
   * @param bubbles - D3 selection of bubble groups
   * @param data - Processed data points
   */
  attachBubbleEvents(bubbles: any, data: ProcessedDataPoint<T>[]): void {
    // Mouse events
    if (this.eventHandlers.click) {
      bubbles.on('click', this.createEventHandler('click', data));
    }

    if (this.eventHandlers.mouseover) {
      bubbles.on('mouseover', this.createEventHandler('mouseover', data));
    }

    if (this.eventHandlers.mouseout) {
      bubbles.on('mouseout', this.createEventHandler('mouseout', data));
    }

    if (this.eventHandlers.mouseenter) {
      bubbles.on('mouseenter', this.createEventHandler('mouseenter', data));
    }

    if (this.eventHandlers.mouseleave) {
      bubbles.on('mouseleave', this.createEventHandler('mouseleave', data));
    }

    // Tooltip events
    if (this.config.tooltip && this.tooltip) {
      this.attachTooltipEvents(bubbles, data);
    }

    // Hover state styling
    this.attachHoverStates(bubbles);
  }

  /**
   * Create D3 event handler with proper typing
   * @param eventType - Type of event
   * @param data - Data array for context
   * @returns D3 event handler function
   */
  private createEventHandler(
    eventType: keyof BubbleEventHandlers<T>,
    _data: ProcessedDataPoint<T>[]
  ): (event: MouseEvent, d: any, _i: number) => void {
    const handler = this.eventHandlers[eventType] as DataEventHandler<T>;
    
    return (event: MouseEvent, d: any, _i: number) => {
      // Extract original data item from LayoutNode -> ProcessedDataPoint -> original data
      // ALWAYS use the D3-bound data (d parameter) since it's correctly sorted by layout
      let dataItem: T;
      
      if (d && d.data && d.data.data) {
        // d is a LayoutNode with data property containing ProcessedDataPoint
        dataItem = d.data.data;
      } else if (d && d.data) {
        // d.data might be the original data directly
        dataItem = d.data;
      } else {
        // Should not happen in normal operation - something is wrong with data binding
        console.warn('No valid data found in event handler, skipping event');
        return; // Skip event handling rather than using wrong data
      }
      
      const target = event.target as SVGElement;
      handler(dataItem, event, target);
    };
  }

  /**
   * Attach tooltip events to bubbles
   * @param bubbles - D3 selection of bubble groups
   * @param data - Processed data points
   */
  private attachTooltipEvents(bubbles: any, data: ProcessedDataPoint<T>[]): void {
    if (!this.tooltip) return;

    const extractDataItem = (d: any, i: number): T => {
      if (d && d.data && d.data.data) {
        return d.data.data; // LayoutNode -> ProcessedDataPoint -> original data
      } else if (d && d.data) {
        return d.data; // LayoutNode with original data directly
      } else if (data[i] && data[i].data) {
        return data[i].data; // ProcessedDataPoint
      } else {
        return d; // Fallback
      }
    };

    bubbles
      .on('mouseover.tooltip', (event: MouseEvent, d: any, i: number) => {
        const dataItem = extractDataItem(d, i);
        const tooltipItems = this.generateTooltipItems(dataItem);
        this.tooltip!.show(event, dataItem, tooltipItems);
      })
      .on('mousemove.tooltip', (event: MouseEvent, d: any, i: number) => {
        const dataItem = extractDataItem(d, i);
        const tooltipItems = this.generateTooltipItems(dataItem);
        this.tooltip!.update(event, tooltipItems);
      })
      .on('mouseout.tooltip', () => {
        this.tooltip!.hide();
      });
  }

  /**
   * Generate tooltip items for a data point
   * @param dataItem - Data item
   * @returns Array of tooltip items
   */
  private generateTooltipItems(dataItem: T): TooltipItem[] {
    if (typeof this.config.tooltip === 'function') {
      return this.config.tooltip(dataItem);
    }

    // Default tooltip items
    const items: TooltipItem[] = [];

    // Add label
    if (typeof this.config.label === 'string') {
      items.push({
        name: 'Label',
        value: String((dataItem as any)[this.config.label] || 'Unknown')
      });
    }

    // Add size
    if (typeof this.config.size === 'string') {
      const sizeValue = (dataItem as any)[this.config.size];
      items.push({
        name: 'Size',
        value: this.config.format?.number ? 
          this.config.format.number(sizeValue, dataItem) : 
          String(sizeValue || 0)
      });
    }

    // Add other common properties
    const commonProps = ['category', 'type', 'year', 'count', 'amount'];
    commonProps.forEach(prop => {
      if (prop in dataItem && (dataItem as any)[prop] != null) {
        items.push({
          name: prop.charAt(0).toUpperCase() + prop.slice(1),
          value: String((dataItem as any)[prop])
        });
      }
    });

    return items;
  }

  /**
   * Attach hover state styling
   * @param bubbles - D3 selection of bubble groups
   */
  private attachHoverStates(bubbles: any): void {
    bubbles
      .on('mouseenter.hover', function(this: any, _event: MouseEvent) {
        d3.select(this)
          .select('circle')
          .style('opacity', 1)
          .style('stroke-width', 3);
      })
      .on('mouseleave.hover', function(this: any, _event: MouseEvent) {
        d3.select(this)
          .select('circle')
          .style('opacity', 0.8)
          .style('stroke-width', 2);
      });
  }

  /**
   * Create tooltip manager instance
   * @returns Tooltip manager
   */
  private createTooltipManager(): TooltipManager {
    let tooltipDiv: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

    return {
      show: (event: MouseEvent, _data: any, items: TooltipItem[]) => {
        this.hideTooltip();
        
        tooltipDiv = d3.select('body')
          .append('div')
          .attr('class', 'bubble-chart-tooltip')
          .style('position', 'absolute')
          .style('padding', '10px')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('border-radius', '5px')
          .style('font-size', '12px')
          .style('font-family', 'Arial, sans-serif')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', '1000');

        const content = items.map(item => 
          `<div><strong>${item.name}:</strong> ${item.value}</div>`
        ).join('');

        tooltipDiv.html(content);

        // Position tooltip
        const rect = tooltipDiv.node()!.getBoundingClientRect();
        const x = event.pageX + 10;
        const y = event.pageY - rect.height - 10;

        tooltipDiv
          .style('left', `${x}px`)
          .style('top', `${y}px`)
          .transition()
          .duration(200)
          .style('opacity', 1);
      },

      hide: () => {
        this.hideTooltip();
      },

      update: (event: MouseEvent, items: TooltipItem[]) => {
        if (tooltipDiv) {
          const content = items.map(item => 
            `<div><strong>${item.name}:</strong> ${item.value}</div>`
          ).join('');

          tooltipDiv.html(content);

          // Update position
          const rect = tooltipDiv.node()!.getBoundingClientRect();
          const x = event.pageX + 10;
          const y = event.pageY - rect.height - 10;

          tooltipDiv
            .style('left', `${x}px`)
            .style('top', `${y}px`);
        }
      },

      destroy: () => {
        this.hideTooltip();
      }
    };
  }

  /**
   * Hide tooltip helper
   */
  private hideTooltip(): void {
    d3.selectAll('.bubble-chart-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Add keyboard navigation support
   * @param bubbles - D3 selection of bubble groups
   * @param data - Processed data points
   */
  addKeyboardNavigation(bubbles: any, data: ProcessedDataPoint<T>[]): void {
    // Make bubbles focusable
    bubbles.attr('tabindex', 0);

    // Add keyboard event listeners
    bubbles.on('keydown', (event: KeyboardEvent, d: any, i: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (this.eventHandlers.click) {
          // Extract original data using same logic as click events
          let dataItem: T;
          if (d && d.data && d.data.data) {
            dataItem = d.data.data;
          } else if (d && d.data) {
            dataItem = d.data;
          } else if (data[i] && data[i].data) {
            dataItem = data[i].data;
          } else {
            dataItem = d;
          }
          
          const target = event.target as SVGElement;
          this.eventHandlers.click(dataItem, event as any, target);
        }
      }
    });

    // Add focus styling
    bubbles
      .on('focus', function(this: any) {
        d3.select(this)
          .select('circle')
          .style('stroke', '#007bff')
          .style('stroke-width', 3);
      })
      .on('blur', function(this: any) {
        d3.select(this)
          .select('circle')
          .style('stroke', '#fff')
          .style('stroke-width', 2);
      });
  }

  /**
   * Clean up all event listeners and tooltip
   */
  destroy(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
    }
    
    // Remove all event listeners
    if (this.svg) {
      this.svg.selectAll('*').on('.tooltip', null);
      this.svg.selectAll('*').on('.hover', null);
    }

    this.eventHandlers = {};
  }
} 