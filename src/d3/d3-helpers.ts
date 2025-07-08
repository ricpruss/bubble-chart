/**
 * D3.js helper types and utilities for Bubble Chart library
 * Provides type-safe D3.js operations and common patterns
 */

import * as d3 from 'd3';
import type { BubbleChartData, HierarchicalBubbleData } from '../data/index.js';

/**
 * Common D3.js selection types for SVG elements
 */
export type SVGSelection = d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
export type GroupSelection = d3.Selection<SVGGElement, unknown, HTMLElement, any>;
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
 * Note: All helper functions have been removed as they were either:
 * - Redundant with D3DataUtils implementations
 * - Not used in current implementation
 * This file now contains only type definitions for D3.js operations.
 */
