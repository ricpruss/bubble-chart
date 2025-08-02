/**
 * Bubble Chart Library - Clean D3-Style Entry Point
 * Consolidated, well-organized exports following TypeScript best practices
 */

// Main API - clean D3-style fluent interface
export { BubbleChart } from './chart.js';

// Advanced users can import builders directly  
export { BuilderFactory } from './builders/builder-factory.js';

// All types in one place
export * from './types.js';

// For direct builder usage (advanced)
export { 
  BubbleBuilder,
  MotionBubble, 
  WaveBubble,
  LiquidBubble,
  TreeBuilder,
  OrbitBuilder,
  ListBuilder
} from './builders/index.js';
