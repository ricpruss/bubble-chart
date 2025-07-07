// Export the modern fluent API as the main interface
export {
  BubbleChart,
  BubbleChartBuilder,
  type IBubbleChart,
  
  // Data management
  DataStore,
  type ChangeStats,
  
  // Intelligence and automation
  DataIntelligence,
  type DataIntelligenceInsights,
  type DataFieldAnalysis,
  type DataQualityIssue,
  
  // Animation system
  AnimationPresets,
  type AnimationConfig,
  type AnimationPresetName,
  
  // Smart tooltips
  SmartTooltips,
  type TooltipContent
} from './reactive/index.js';

// Export reactive builder for advanced use cases
export {
  ReactiveBubbleBuilder
} from './reactive/index.js';

// Export common building blocks for advanced usage
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
export { BubbleBuilder } from './bubble-builder.js';
export { TreeBuilder } from './tree-builder.js';
export { MotionBubble } from './motion-bubble.js';
export { WaveBubble } from './wave-bubble.js';
export { LiquidBubble } from './liquid-bubble.js';
export { OrbitBuilder } from './orbit-builder.js';
export { ListBuilder } from './list-builder.js';

// Re-export key types for external usage
export type {
  BubbleChartData,
  BubbleChartOptions,
  ChartType,
  BubbleEventType,
  BubbleEventHandlers
} from './types/index.js';

// Make the fluent API the default export
import { BubbleChart } from './reactive/index.js';
export { BubbleChart as default };
