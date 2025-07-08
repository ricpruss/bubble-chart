/**
 * Type definitions for the Bubble Chart library
 * Entry point for all type exports
 */

// Data types
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
} from '../data/index.js';

export {
  isFlatBubbleData,
  isHierarchicalBubbleData,
  isTimeSeriesBubbleData,
  isFlatDataArray,
  isHierarchicalData,
  isTimeSeriesDataArray,
  getNumericValue,
  getStringValue
} from '../data/index.js';

// Event types
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
} from '../events/index.js';

export {
  BubbleEvent,
  createD3EventHandler,
  isValidEventType,
  createEventPayload,
  debounceEventHandler,
  throttleEventHandler
} from '../events/index.js';

// Configuration types
export type {
  ChartType,
  TimeContainer,
  FormatFunctions,
  TooltipItem,
  TooltipMode,
  TooltipField,
  TooltipConfig,
  WaveConfig,
  TreeConfig,
  AnimationConfig,
  BubbleConfig,
  ToggleConfig,
  ListBubbleConfig,
  BubbleChartOptions,
  ChartHandle,
  ColorScale,
  SizeScale,
  TimeScale,
  SVGSelection,
  GroupSelection,
  CircleSelection,
  TextSelection,
  StreamingOptions,
  EnterAnimationOptions,
  ExitAnimationOptions,
  UpdateAnimationOptions,
  StreamingUpdateResult
} from '../config/index.js';

// D3 helper types
export type { 
  SVGSelection as D3SVGSelection,
  GroupSelection as D3GroupSelection,
  CircleSelection as D3CircleSelection,
  TextSelection as D3TextSelection,
  PathSelection,
  RectSelection,
  DataSelection,
  LinearScale,
  OrdinalScale,
  SqrtScale,
  TimeScale as D3TimeScale,
  BandScale,
  PackLayout,
  HierarchyNode,
  PackHierarchyNode,
  Transition,
  ForceSimulation,
  ForceCenter,
  ForceCollide,
  ForceManyBody,
  NumericAccessor,
  StringAccessor,
  ColorAccessor
} from '../d3/index.js';

// Configuration validation and defaults
export { validateConfig, createDefaultConfig, defaultStreamingOptions } from '../config/index.js';
