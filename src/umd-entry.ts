import { BubbleChart, DataStore, createBubbleChart } from './index.js';

// Create the global BubbleChart object with reactive functionality
const BubbleChartWithReactive = Object.assign(BubbleChart, {
  DataStore,
  createBubbleChart
});

export default BubbleChartWithReactive; 