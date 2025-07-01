/**
 * D3.js helper types and utilities for Bubble Chart library
 * Provides type-safe D3.js operations and common patterns
 */

import * as d3 from 'd3';
import type { BubbleChartData, HierarchicalBubbleData } from './data.js';

/**
 * Common D3.js selection types for SVG elements
 */
export type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type CircleSelection<T = BubbleChartData> = d3.Selection<SVGCircleElement, T, SVGGElement, unknown>;
export type TextSelection<T = BubbleChartData> = d3.Selection<SVGTextElement, T, SVGGElement, unknown>;
export type PathSelection<T = BubbleChartData> = d3.Selection<SVGPathElement, T, SVGGElement, unknown>;
export type RectSelection<T = BubbleChartData> = d3.Selection<SVGRectElement, T, SVGGElement, unknown>;

/**
 * Generic selection type for any SVG element with data binding
 */
export type DataSelection<TElement extends SVGElement, TData = BubbleChartData> = 
  d3.Selection<TElement, TData, SVGGElement, unknown>;

/**
 * D3.js scale types commonly used in bubble charts
 */
export type LinearScale = d3.ScaleLinear<number, number>;
export type OrdinalScale<T extends string = string> = d3.ScaleOrdinal<T, string>;
export type SqrtScale = d3.ScalePower<number, number>;
export type TimeScale = d3.ScaleTime<number, number>;
export type BandScale = d3.ScaleBand<string>;

/**
 * D3.js layout types for different chart configurations
 */
export type PackLayout<T = BubbleChartData> = d3.PackLayout<T>;
export type HierarchyNode<T = HierarchicalBubbleData> = d3.HierarchyNode<T>;
export type PackHierarchyNode<T = HierarchicalBubbleData> = d3.HierarchyCircularNode<T>;

/**
 * D3.js transition types
 */
export type Transition<TElement extends d3.BaseType = SVGElement, TData = BubbleChartData> = 
  d3.Transition<TElement, TData, SVGGElement, unknown>;

/**
 * D3.js simulation types for force-directed layouts
 */
export type ForceSimulation = d3.Simulation<d3.SimulationNodeDatum, undefined>;
export type ForceCenter = d3.ForceCenter<d3.SimulationNodeDatum>;
export type ForceCollide = d3.ForceCollide<d3.SimulationNodeDatum>;
export type ForceManyBody = d3.ForceManyBody<d3.SimulationNodeDatum>;

/**
 * Accessor function types for extracting values from data
 */
export type NumericAccessor<T = BubbleChartData> = (d: T, i?: number) => number;
export type StringAccessor<T = BubbleChartData> = (d: T, i?: number) => string;
export type ColorAccessor<T = BubbleChartData> = (d: T, i?: number) => string;

/**
 * Utility types for D3.js data binding patterns
 */
export interface DataJoin<TElement extends SVGElement, TData = BubbleChartData> {
  enter: d3.Selection<d3.EnterElement, TData, SVGGElement, unknown>;
  update: d3.Selection<TElement, TData, SVGGElement, unknown>;
  exit: d3.Selection<TElement, TData, SVGGElement, unknown>;
}

/**
 * Helper functions for creating type-safe D3.js operations
 */

/**
 * Creates a type-safe pack layout for hierarchical data
 */
export function createPackLayout<T = HierarchicalBubbleData>(
  width: number, 
  height: number, 
  padding = 1
): PackLayout<T> {
  return d3.pack<T>()
    .size([width, height])
    .padding(padding);
}

/**
 * Creates a type-safe linear scale for bubble sizing
 */
export function createSizeScale(
  domain: [number, number], 
  range: [number, number]
): LinearScale {
  return d3.scaleLinear()
    .domain(domain)
    .range(range);
}

/**
 * Creates a type-safe square root scale for bubble areas
 */
export function createSqrtScale(
  domain: [number, number], 
  range: [number, number]
): SqrtScale {
  return d3.scaleSqrt()
    .domain(domain)
    .range(range);
}

/**
 * Creates a type-safe ordinal color scale
 */
export function createColorScale(colors: string[]): OrdinalScale {
  return d3.scaleOrdinal<string>()
    .range(colors);
}

/**
 * Creates a type-safe time scale for temporal data
 */
export function createTimeScale(
  domain: [Date, Date], 
  range: [number, number]
): TimeScale {
  return d3.scaleTime()
    .domain(domain)
    .range(range);
}

/**
 * Creates a type-safe force simulation
 */
export function createForceSimulation(
  nodes: d3.SimulationNodeDatum[]
): ForceSimulation {
  return d3.forceSimulation(nodes);
}

/**
 * Type-safe data binding helper
 */
export function bindData<TElement extends SVGElement, TData = BubbleChartData>(
  selection: d3.Selection<SVGGElement, unknown, null, undefined>,
  selector: string,
  data: TData[],
  keyFunction?: (d: TData, i: number) => string
): DataJoin<TElement, TData> {
  const bound = selection
    .selectAll<TElement, TData>(selector)
    .data(data, keyFunction);
    
  return {
    enter: bound.enter(),
    update: bound,
    exit: bound.exit()
  };
}

/**
 * Type-safe SVG creation helper
 */
export function createSVG(
  container: string | Element,
  width: number,
  height: number,
  margin = { top: 0, right: 0, bottom: 0, left: 0 }
): { svg: SVGSelection; g: GroupSelection } {
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
    
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
  return { svg, g };
}

/**
 * Type-safe circle creation with data binding
 */
export function createCircles<T = BubbleChartData>(
  container: GroupSelection,
  data: T[],
  radiusAccessor: NumericAccessor<T>,
  colorAccessor?: ColorAccessor<T>
): CircleSelection<T> {
  return container
    .selectAll<SVGCircleElement, T>('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('r', radiusAccessor)
    .attr('fill', colorAccessor || '#333');
}

/**
 * Type-safe text label creation with data binding
 */
export function createLabels<T = BubbleChartData>(
  container: GroupSelection,
  data: T[],
  textAccessor: StringAccessor<T>,
  className = 'label'
): TextSelection<T> {
  return container
    .selectAll<SVGTextElement, T>(`text.${className}`)
    .data(data)
    .enter()
    .append('text')
    .attr('class', className)
    .text(textAccessor)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle');
}

/**
 * Type-safe transition creation
 */
export function createTransition<TElement extends d3.BaseType, TData = BubbleChartData>(
  selection: d3.Selection<TElement, TData, any, any>,
  duration = 750,
  ease = d3.easeElastic
): Transition<TElement, TData> {
  return selection
    .transition()
    .duration(duration)
    .ease(ease);
}

/**
 * Type-safe event handler attachment
 */
export function attachEventHandlers<TElement extends SVGElement, TData = BubbleChartData>(
  selection: d3.Selection<TElement, TData, any, any>,
  handlers: {
    click?: (event: MouseEvent, d: TData) => void;
    mouseover?: (event: MouseEvent, d: TData) => void;
    mouseout?: (event: MouseEvent, d: TData) => void;
  }
): void {
  if (handlers.click) {
    selection.on('click', handlers.click);
  }
  if (handlers.mouseover) {
    selection.on('mouseover', handlers.mouseover);
  }
  if (handlers.mouseout) {
    selection.on('mouseout', handlers.mouseout);
  }
}

/**
 * Helper to safely select DOM elements with type checking
 */
export function safeSelect(selector: string): d3.Selection<HTMLElement, unknown, null, undefined> {
  const selection = d3.select<HTMLElement, unknown>(selector);
  if (selection.empty()) {
    throw new Error(`Element with selector "${selector}" not found`);
  }
  return selection;
}

/**
 * Helper to get dimensions from a DOM element
 */
export function getElementDimensions(
  element: Element
): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
}

/**
 * Type-safe zoom behavior creation
 */
export function createZoomBehavior<T = Element>(
  onZoom: (event: d3.D3ZoomEvent<T, unknown>) => void
): d3.ZoomBehavior<T, unknown> {
  return d3.zoom<T, unknown>()
    .on('zoom', onZoom);
}

/**
 * Creates properly typed hierarchy from flat data
 */
export function createHierarchy<T = HierarchicalBubbleData>(
  data: T,
  sizeAccessor?: (d: T) => number
): HierarchyNode<T> {
  const hierarchy = d3.hierarchy<T>(data);
  
  if (sizeAccessor) {
    return hierarchy.sum(sizeAccessor);
  }
  
  return hierarchy;
}

/**
 * Format numbers using D3's locale-aware formatting
 */
export function formatNumber(
  value: number,
  format = '.2s'
): string {
  return d3.format(format)(value);
}

/**
 * Format dates using D3's time formatting
 */
export function formatDate(
  date: Date,
  format = '%Y-%m-%d'
): string {
  return d3.timeFormat(format)(date);
} 