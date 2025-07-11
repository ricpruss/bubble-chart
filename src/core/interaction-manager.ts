/**
 * D3-Native Interaction Management System
 * Centralized handling of events, tooltips, and user interactions using D3-native patterns
 */

import * as d3 from "d3";
import type { BubbleChartData, BubbleEventHandlers } from "../types/index.js";
import type { BubbleChartOptions, TooltipItem } from "../config/index.js";

export class InteractionManager<T extends BubbleChartData = BubbleChartData> {
  private tooltipDiv: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;

  constructor(private config: BubbleChartOptions) {}

  /**
   * Attach native D3 event handling to bubbles
   * @param bubbles - D3 selection of bubble elements
   * @param eventHandlers - Object containing event handlers
   */
  attachEvents(bubbles: d3.Selection<any, T, any, any>, eventHandlers: Partial<BubbleEventHandlers<T>>): void {
    // Attach mouse events if handlers are provided
    if (eventHandlers.click) {
      bubbles.on("click", (event, d) => {
        const dataItem = d.data?.data || d.data || d;
        eventHandlers.click!(dataItem, event, event.target as SVGElement);
      });
    }

    if (eventHandlers.mouseover) {
      bubbles.on("mouseover", (event, d) => {
        const dataItem = d.data?.data || d.data || d;
        eventHandlers.mouseover!(dataItem, event, event.target as SVGElement);
      });
    }

    if (eventHandlers.mouseout) {
      bubbles.on("mouseout", (event, d) => {
        const dataItem = d.data?.data || d.data || d;
        eventHandlers.mouseout!(dataItem, event, event.target as SVGElement);
      });
    }

    // Hover styling
    this.attachHoverEffects(bubbles);

    // Tooltip interaction
    if (this.config.tooltip) {
      this.attachTooltipEvents(bubbles);
    }
  }

  /**
   * Attach tooltip events using D3-native patterns
   * @param bubbles - D3 selection of bubble elements
   */
  private attachTooltipEvents(bubbles: d3.Selection<any, T, any, any>): void {
    bubbles
      .on("mouseover.tooltip", (event, d) => {
        // Extract data item from different data structures
        // BubbleBuilder: d.data.data (LayoutNode -> ProcessedDataPoint -> original data)
        // MotionBubble: d.data (direct data)
        const dataItem = d.data?.data || d.data || d;
        const items = this.generateTooltipItems(dataItem);
        this.showTooltip(event, items);
      })
      .on("mousemove.tooltip", (event) => this.updateTooltipPosition(event))
      .on("mouseout.tooltip", () => this.hideTooltip());
  }

  /**
   * Show tooltip
   */
  private showTooltip(event: MouseEvent, items: TooltipItem[]): void {
    if (!this.tooltipDiv) {
      this.tooltipDiv = d3
        .select("body")
        .append("div")
        .attr("class", "bubble-chart-tooltip")
    }

    const content = items
      .map((item) => `<div><strong>${item.name}:</strong> ${item.value}</div>`)
      .join("");

    this.tooltipDiv.html(content); // Set content

    this.updateTooltipPosition(event); // Initial position

    this.tooltipDiv.transition().duration(200).style("opacity", 1);
  }

  /**
   * Update tooltip position
   */
  private updateTooltipPosition(event: MouseEvent): void {
    if (this.tooltipDiv) {
      const rect = this.tooltipDiv.node()!.getBoundingClientRect();
      const x = event.pageX + 10;
      const y = event.pageY - rect.height - 10;

      this.tooltipDiv
        .style("left", `${x}px`)
        .style("top", `${y}px`);
    }
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipDiv) {
      this.tooltipDiv.transition().duration(200).style("opacity", 0).remove();
      this.tooltipDiv = null;
    }
  }

  /**
   * Generate tooltip items for a data point
   */
  private generateTooltipItems(dataItem: T): TooltipItem[] {
    if (typeof this.config.tooltip === "function") {
      return this.config.tooltip(dataItem);
    }

    const items: TooltipItem[] = [];

    if (typeof this.config.label === "string") {
      items.push({
        name: "Label",
        value: String((dataItem as any)[this.config.label] || "Unknown"),
      });
    }

    if (typeof this.config.size === "string") {
      const sizeValue = (dataItem as any)[this.config.size];
      items.push({
        name: "Size",
        value: this.config.format?.number
          ? this.config.format.number(sizeValue, dataItem)
          : String(sizeValue || 0),
      });
    }

    const commonProps = ["category", "type", "year", "count", "amount"];
    commonProps.forEach((prop) => {
      if (prop in dataItem && (dataItem as any)[prop] != null) {
        items.push({
          name: prop.charAt(0).toUpperCase() + prop.slice(1),
          value: String((dataItem as any)[prop]),
        });
      }
    });

    return items;
  }

  /**
   * Attach hover effects to bubbles
   * @param bubbles - D3 selection of bubble elements
   */
  private attachHoverEffects(bubbles: d3.Selection<any, T, any, any>): void {
    bubbles
      .on("mouseenter.hover", function (this: any, _event: MouseEvent) {
        d3.select(this)
          .select("circle")
          .style("opacity", 1)
          .style("stroke-width", 3);
      })
      .on("mouseleave.hover", function (this: any, _event: MouseEvent) {
        d3.select(this)
          .select("circle")
          .style("opacity", 0.8)
          .style("stroke-width", 2);
      });
  }
}

