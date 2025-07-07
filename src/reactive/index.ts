/**
 * Reactive Module Exports
 * All reactive functionality for bubble chart library
 */

// Core reactive primitives
// export {
//   SimpleObservable,
//   ObservableAdapter,
//   createObservable,
//   isObservable,
//   fromEvent,
//   interval,
//   type Observable,
//   type ObserverFunction,
//   type UnsubscribeFunction,
//   type TransformFunction
// } from './observable.js';

// Data sources
// export {
//   StaticDataSource,
//   WebSocketDataSource,
//   PollingDataSource,
//   EventDataSource,
//   ObservableDataSource,
//   type DataSource,
//   type DataSourceConfig
// } from './data-sources.js';

// Data source factory
// export {
//   DataSourceFactory,
//   DataSourceHelpers
// } from './data-source-factory.js';

// Reactive chart builder
// export {
//   ReactiveChartBuilder,
//   createReactiveChart,
//   isReactiveChart
// } from './reactive-chart-builder.js';

// Reactive bubble builder
export {
  ReactiveBubbleBuilder
} from './reactive-bubble-builder.js';

// Explicitly re-export streaming methods for UMD/global usage
// export type { StreamingOptions, EnterAnimationOptions, ExitAnimationOptions, UpdateAnimationOptions, StreamingUpdateResult } from '../types/config.js';
// export { defaultStreamingOptions } from '../types/config.js';

// New D3-native reactive API exports
export {
  FluentChartAPI,
  createChart,
  type BubbleChart as IChart
} from './fluent-api.js';

// Legacy reactive API exports
export { DataStore, type ChangeStats } from './store.js';
export { 
  BubbleChart,
  BubbleChartBuilder,
  type BubbleChart as IBubbleChart
} from './chart.js';

// Export configuration types
export {
  type BubbleChartOptionsExtended as BubbleChartOptions
} from './reactive-config.js';

// Phase 2A: Core API Enhancement exports
export { 
  DataIntelligence, 
  type DataIntelligenceInsights,
  type DataFieldAnalysis,
  type DataQualityIssue 
} from './data-intelligence.js';

export { 
  AnimationPresets,
  type AnimationPresetName 
} from './animation-presets.js';

// Export AnimationConfig from central types
export type { AnimationConfig } from '../types/config.js';

export { 
  SmartTooltips,
  type TooltipContent 
} from './smart-tooltips.js'; 