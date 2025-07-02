import { 
  BubbleChart as ClassicBubbleChart, 
  ReactiveBubbleChart, 
  BubbleChartBuilder,
  DataStore, 
  createBubbleChart,
  DataIntelligence,
  AnimationPresets,
  SmartTooltips
} from './index.js';

// Create the global BubbleChart object with all functionality
const BubbleChartGlobal = Object.assign(ReactiveBubbleChart, {
  // Classic API for backward compatibility
  Classic: ClassicBubbleChart,
  
  // Reactive API
  DataStore,
  createBubbleChart,
  BubbleChartBuilder,
  
  // Phase 2A Intelligence Features
  DataIntelligence,
  AnimationPresets,
  SmartTooltips
});

export default BubbleChartGlobal; 