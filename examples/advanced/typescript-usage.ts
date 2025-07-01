// TypeScript example for Bubble Chart
// -----------------------------------
// 1. Install the library locally first:
//      npm install bubble-chart d3
// 2. Compile this file with your favourite bundler or just `tsc`
// 3. Open index.html that imports the generated JS (or use Vite / Parcel which handles ES modules automatically).

// If you installed the package from npm, use the line below instead:
// import { BubbleChart, BubbleChartOptions } from 'bubble-chart';

// For local development inside this repo we import the built ESM file so the
// TypeScript compiler can resolve the declaration file that sits next to it.
import BubbleChart from '../../dist/bubble-chart.esm.js';
import type { BubbleChartOptions } from '../../dist/bubble-chart';

interface LanguageDatum {
  label: string;
  size: number;
  count: number;
  // Additional properties to satisfy BubbleChartData constraint
  [key: string]: unknown;
}

const data: LanguageDatum[] = [
  { label: 'JavaScript', size: 2065724632, count: 50 },
  { label: 'Python', size: 141765766652, count: 80 },
  { label: 'Java', size: 48130171902, count: 65 },
];

const options: BubbleChartOptions<LanguageDatum> = {
      container: '#bubble-chart',
  label: 'label',
  size: 'size',
  type: 'wave',
  defaultColor: '#4CAF50',
  percentage: (d: LanguageDatum) => d.count / 100,
  format: {
    text: (text: string) => text.toUpperCase(),
    number: (num: number) => Intl.NumberFormat('en', { notation: 'compact' }).format(num),
  },
  tooltip: (d: LanguageDatum) => [
    { value: d.label, name: 'Language:' },
    { value: Intl.NumberFormat('en').format(d.size), name: 'Size:' },
    { value: `${d.count}%`, name: 'Popularity:' },
  ],
};

const chart = new BubbleChart<LanguageDatum>(options);
chart.data(data); 