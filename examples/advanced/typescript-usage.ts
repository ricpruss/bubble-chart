// TypeScript example for Bubble Chart - Fluent API
// ------------------------------------------------
// 1. Install the library locally first:
//      npm install bubble-chart d3
// 2. Compile this file with your favourite bundler or just `tsc`
// 3. Open index.html that imports the generated JS (or use Vite / Parcel which handles ES modules automatically).

// If you installed the package from npm, use the line below instead:
// import { BubbleChart } from 'bubble-chart';

// For local development inside this repo we import the built ESM file so the
// TypeScript compiler can resolve the declaration file that sits next to it.
// BubbleChart now uses the modern fluent API by default
import { BubbleChart, type BubbleChartData } from '../../dist/bubble-chart.esm.js';

interface LanguageDatum {
  id: string;
  label: string;
  size: number;
  count: number;
  category: string;
  // Allow additional properties to make it compatible with BubbleChartData
  [key: string]: unknown;
}

const data: LanguageDatum[] = [
  { id: 'lang-1', label: 'JavaScript', size: 2065724632, count: 50, category: 'Frontend' },
  { id: 'lang-2', label: 'Python', size: 141765766652, count: 80, category: 'Backend' },
  { id: 'lang-3', label: 'Java', size: 48130171902, count: 65, category: 'Enterprise' },
];

// Create chart using D3-native fluent API - automatic field detection
// 🚀 D3-Native: Chart renders automatically when data is bound!
const chart = BubbleChart.create('#bubble-chart')
  .withData(data as BubbleChartData[])   // ✨ Auto-renders here!
  .withLabel('label')
  .withSize('size')
  .withType('wave')
  .withColor('category')                 // Color by category for visual distinction
  .withPercentage((d: BubbleChartData) => (d as unknown as LanguageDatum).count / 100)
  .build();                              // Returns live chart instance

// Example of adding event handlers for DOM interactions
// Note: Event handling simplified for D3-native API
console.log('Chart supports event handling via chart.on() method');
// chart.on('click', (d, event, element) => { /* event handling */ });
// chart.on('mouseover', (d, event, element) => { /* event handling */ });

// Chart is now rendered - lifecycle events are handled internally
console.log('Chart created and rendered successfully');

// Example of updating data dynamically using D3-native update
setTimeout(() => {
  const newData: LanguageDatum[] = [
    { id: 'lang-1', label: 'JavaScript', size: 2065724632, count: 55, category: 'Frontend' },
    { id: 'lang-2', label: 'Python', size: 141765766652, count: 85, category: 'Backend' },
    { id: 'lang-3', label: 'Java', size: 48130171902, count: 60, category: 'Enterprise' },
    { id: 'lang-4', label: 'TypeScript', size: 89456123, count: 45, category: 'Frontend' },
  ];
  
  // Use D3-native update method
  chart.update(newData as BubbleChartData[]);
  console.log('Data updated with TypeScript added');
}, 5000);
