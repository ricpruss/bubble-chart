/**
 * Core Building Blocks for Bubble Chart Library
 * Consolidated exports for unified architecture
 */

// Core managers and infrastructure
export { SVGManager, type SVGElements, type SVGDimensions } from './svg-manager.js';
export { InteractionManager } from './interaction-manager.js';
export { RenderingPipeline } from './rendering-pipeline.js';

// Consolidated composition engine (moved from builders/shared)
export { ChartPipeline } from './pipeline.js';

// Consolidated utilities (merged from d3/, utils/, etc.)
export * from './utils.js';

// Base chart builder (foundation for all chart types)
export { BaseChartBuilder } from './base.js'; 