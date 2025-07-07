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
import BubbleChart, { type BubbleChartData } from '../../dist/bubble-chart.esm.js';

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

// Create chart using fluent API - automatic field detection
const chart = BubbleChart.create('#bubble-chart')
  .withData(data as BubbleChartData[])
  .withLabel('label')
  .withSize('size')
  .withType('wave')
  .withColor('category')  // Color by category for visual distinction
  .withPercentage((d: BubbleChartData) => (d as unknown as LanguageDatum).count / 100)
  .withAnimations('gentle')
  .withCustomConfig({
    format: {
      text: (text: string) => text.toUpperCase(),
      number: (num: number) => Intl.NumberFormat('en', { notation: 'compact' }).format(num),
    },
    tooltip: (d: BubbleChartData) => {
      const lang = d as unknown as LanguageDatum;
      return [
        { value: lang.label, name: 'Language:' },
        { value: Intl.NumberFormat('en').format(lang.size), name: 'Size:' },
        { value: `${lang.count}%`, name: 'Popularity:' },
        { value: lang.category, name: 'Category:' },
      ];
    },
  })
  .render();

// Example of adding event handlers for DOM interactions
// Note: Events use the reactive store data, not layout node indices
chart.onBubble('click', (d: BubbleChartData, _event: MouseEvent, _element: SVGElement) => {
  const lang = d as unknown as LanguageDatum;
  console.log(`Clicked ${lang.label}: ${Intl.NumberFormat('en').format(lang.size)} bytes (${lang.count}% popular)`);
  alert(`You clicked on ${lang.label} (${lang.category})!`);
});

chart.onBubble('mouseover', (d: BubbleChartData, _event: MouseEvent, _element: SVGElement) => {
  const lang = d as unknown as LanguageDatum;
  console.log(`Mouse over ${lang.label}`);
});

// Example of listening to lifecycle events
chart.on('render', () => {
  console.log('Chart rendered successfully');
});

// Example of updating data dynamically using the reactive store
setTimeout(() => {
  const newData: LanguageDatum[] = [
    { id: 'lang-1', label: 'JavaScript', size: 2065724632, count: 55, category: 'Frontend' },
    { id: 'lang-2', label: 'Python', size: 141765766652, count: 85, category: 'Backend' },
    { id: 'lang-3', label: 'Java', size: 48130171902, count: 60, category: 'Enterprise' },
    { id: 'lang-4', label: 'TypeScript', size: 89456123, count: 45, category: 'Frontend' },
  ];
  
  // Use the reactive store to update data
  chart.store.replaceWith(newData as BubbleChartData[]);
  console.log('Data updated with TypeScript added');
}, 5000);
