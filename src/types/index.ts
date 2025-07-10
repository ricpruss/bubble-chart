/**
 * Type definitions for the Bubble Chart library
 * Entry point for all type exports
 */

// Minimal data constraint for D3-native approach
// Any object with indexable properties that D3 can work with
export type BubbleChartData = Record<string, any>;

// D3-native event handler types
export type DataEventHandler<T extends BubbleChartData = BubbleChartData> = (
  data: T,
  event: MouseEvent | KeyboardEvent,
  target: SVGElement
) => void;

export interface BubbleEventHandlers<T extends BubbleChartData = BubbleChartData> {
  click?: DataEventHandler<T>;
  mouseover?: DataEventHandler<T>;
  mouseout?: DataEventHandler<T>;
  mouseenter?: DataEventHandler<T>;
  mouseleave?: DataEventHandler<T>;
}


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
