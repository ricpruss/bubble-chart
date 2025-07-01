/**
 * TypeScript types for Bubble Chart library
 * Comprehensive type definitions for data structures, configuration, and events
 */

// Data Types
export type {
  BubbleDataPoint,
  FlatBubbleData,
  HierarchicalBubbleData,
  TimeSeriesValue,
  TimeSeriesBubbleData,
  EconomicTimeSeriesData,
  BubbleChartData,
  FlatDataArray,
  TimeSeriesDataArray,
  EconomicDataArray,
  DataAccessor,
  ExtractDataType
} from './data.js';

export {
  isFlatBubbleData,
  isHierarchicalBubbleData,
  isTimeSeriesBubbleData,
  isFlatDataArray,
  isHierarchicalData,
  isTimeSeriesDataArray,
  getNumericValue,
  getStringValue
} from './data.js';

// Configuration Types
export type {
  ChartType,
  AnimationMethod,
  TimeContainer,
  FormatFunctions,
  TooltipItem,
  WaveConfig,
  TreeConfig,
  AnimationConfig,
  BubbleConfig,
  ToggleConfig,
  ListBubbleConfig,
  EventHandlers,
  BubbleChartConfig,
  BubbleChartOptions,
  ColorScale,
  SizeScale,
  TimeScale,
  SVGSelection,
  GroupSelection,
  CircleSelection,
  TextSelection
} from './config.js';

export {
  validateConfig,
  createDefaultConfig
} from './config.js';

// Event Types
export type {
  BubbleEventType,
  DataEventHandler,
  TimeEventHandler,
  LifecycleEventHandler,
  EventHandler,
  BubbleEventHandlers,
  BubbleEventPayload,
  D3EventHandlers,
  EventOptions,
  EventManager
} from './events.js';

export {
  BubbleEvent,
  createD3EventHandler,
  isValidEventType,
  createEventPayload,
  debounceEventHandler,
  throttleEventHandler
} from './events.js';

// D3.js Helper Types (basic exports only, excluding problematic functions)
// Note: d3-helpers.ts temporarily excluded due to complex D3.js type conflicts
// export type {
//   SVGSelection as D3SVGSelection,
//   GroupSelection as D3GroupSelection,
//   CircleSelection as D3CircleSelection,
//   TextSelection as D3TextSelection,
//   PathSelection,
//   RectSelection,
//   DataSelection,
//   LinearScale,
//   OrdinalScale,
//   SqrtScale,
//   TimeScale as D3TimeScale,
//   BandScale,
//   PackLayout,
//   HierarchyNode,
//   PackHierarchyNode,
//   Transition,
//   ForceSimulation,
//   ForceCenter,
//   ForceCollide,
//   ForceManyBody,
//   NumericAccessor,
//   StringAccessor,
//   ColorAccessor,
//   DataJoin
// } from './d3-helpers.js'; 