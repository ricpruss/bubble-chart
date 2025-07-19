// Import the D3-native API (no reactive system)
import { BubbleChart, ResponsiveTextUtils } from './index.js';

// Add ResponsiveTextUtils to the BubbleChart object for UMD usage
(BubbleChart as any).ResponsiveTextUtils = ResponsiveTextUtils;

// Also add ResponsiveTextUtils to the global window object for convenience
if (typeof window !== 'undefined') {
  (window as any).ResponsiveTextUtils = ResponsiveTextUtils;
}

export default BubbleChart;
