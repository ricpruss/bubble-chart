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
// export {
//   ReactiveBubbleBuilder
// } from './reactive-bubble-builder.js';

// Explicitly re-export streaming methods for UMD/global usage
// export type { StreamingOptions, EnterAnimationOptions, ExitAnimationOptions, UpdateAnimationOptions, StreamingUpdateResult } from '../types/config.js';
// export { defaultStreamingOptions } from '../types/config.js';

// New reactive API exports

export { DataStore, type ChangeStats } from './store.js';
export { createBubbleChart, type BubbleChart, type BubbleChartOptions } from './chart.js'; 