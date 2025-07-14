// TypeScript Library for typescript-usage.html demo
// This gets compiled to JavaScript and imported by the HTML file

import { showClickNotification } from './notification-utils.js';

export interface LanguageDatum {
  id: string;
  label: string;
  size: number;
  count: number;
  category: string;
  [key: string]: unknown;
}

export const languageData: LanguageDatum[] = [
  { id: 'lang-1', label: 'JavaScript', size: 37626887, count: 63.61, category: 'Frontend' },
  { id: 'lang-2', label: 'Python', size: 21548185, count: 49.28, category: 'Backend' },
  { id: 'lang-3', label: 'Java', size: 18732432, count: 30.55, category: 'Enterprise' },
];

export const newLanguageData: LanguageDatum[] = [
  { id: 'lang-1', label: 'JavaScript', size: 37626887, count: 63.61, category: 'Frontend' },
  { id: 'lang-2', label: 'Python', size: 21548185, count: 49.28, category: 'Backend' },
  { id: 'lang-3', label: 'Java', size: 18732432, count: 30.55, category: 'Enterprise' },
  { id: 'lang-4', label: 'TypeScript', size: 4200000, count: 38.87, category: 'Modern' },
];

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en').format(num);
}

export function setupEventHandlers(chart: any) {
  // Event handlers with D3-native API
  chart.on('click', (d: LanguageDatum) => {
    console.log(`Clicked ${d.label}: ${formatNumber(d.size)} repositories (${d.count}% developer adoption)`);
    const details = {
      Language: d.label,
      Category: d.category,
      'GitHub Repositories': formatNumber(d.size),
      'Developer Usage': `${d.count}%`,
      'Adoption Rank': d.count > 50 ? 'High' : d.count > 30 ? 'Medium' : 'Low'
    };
    showClickNotification(d.label, details);
  });

  chart.on('mouseenter', (d: LanguageDatum, _event: Event, element: any) => {
    element.style.strokeWidth = '2px';
    element.style.stroke = '#333';
    console.log(`Mouse over ${d.label}: ${formatNumber(d.size)} repos (${d.count}% of devs use it)`);
  });

  chart.on('mouseleave', (_d: LanguageDatum, _event: Event, element: any) => {
    element.style.stroke = 'none';
  });
}