// Import the D3-native API (no reactive system)
import { BubbleChart } from './index.js';
import { calculateResponsiveFontSize, getCurrentBreakpoint, applyResponsiveFontSize, wrapText, truncateText } from './core/utils.js';

// Create ResponsiveTextUtils for backward compatibility
const ResponsiveTextUtils = {
  calculateResponsiveFontSize,
  getCurrentBreakpoint,
  applyResponsiveFontSize,
  wrapText,
  truncateText,
  // Simplified responsive page setup for examples
  createResponsivePage: (selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      (element as HTMLElement).style.maxWidth = '100%';
      (element as HTMLElement).style.margin = '0 auto';
    }
  },
  setupResponsiveHeadings: () => {
    // Simple responsive heading setup
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      (h as HTMLElement).style.fontSize = 'clamp(1rem, 4vw, 2rem)';
    });
  }
};

// Add ResponsiveTextUtils to the BubbleChart object for UMD usage
(BubbleChart as any).ResponsiveTextUtils = ResponsiveTextUtils;

// Also add to window global for convenience
if (typeof window !== 'undefined') {
  (window as any).ResponsiveTextUtils = ResponsiveTextUtils;
}

// For UMD, provide only default export as configured in rollup.config.js
export default BubbleChart;
