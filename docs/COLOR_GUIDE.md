# Color Configuration Guide

The Bubble Chart library provides flexible color configuration options to visualize your data effectively. The color system automatically detects different types of color configurations and handles them appropriately.

## Color Configuration Types

### 1. Single-Parameter Functions

Single-parameter functions receive the full data object and should return a color string.

```typescript
// Sector-based coloring
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: d => {
    switch(d.sector) {
      case 'Technology': return '#3498db';
      case 'Healthcare': return '#2ecc71';
      case 'Finance': return '#e74c3c';
      default: return '#95a5a6';
    }
  }
});

// Value-based coloring
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'profits',
  color: d => {
    if (d.profits > 10000) return '#27ae60'; // High profit - green
    if (d.profits > 5000) return '#f39c12';  // Medium profit - orange
    return '#e74c3c'; // Low profit - red
  }
});

// Using a color mapping object
const sectorColors = {
  'Technology': '#3498db',
  'Healthcare': '#2ecc71',
  'Finance': '#e74c3c',
  'Energy': '#9b59b6',
  'Retail': '#f39c12'
};

const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: d => sectorColors[d.sector] || '#bdc3c7'
});
```

### 2. Multi-Parameter Functions

Multi-parameter functions receive both the data object and the index, allowing for index-based coloring patterns.

```typescript
// Alternating colors
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: (d, i) => i % 2 === 0 ? '#3498db' : '#e74c3c'
});

// Combined data and index logic
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: (d, i) => {
    // Highlight first 3 items differently
    if (i < 3) return '#f1c40f';
    // Color by sector for others
    return d.sector === 'Technology' ? '#3498db' : '#95a5a6';
  }
});

// Creating unique colors based on position
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: (d, i) => `hsl(${(i * 137.5) % 360}, 70%, 50%)`
});
```

### 3. D3 Color Scales

D3 scales provide powerful color mapping capabilities with automatic domain handling.

```typescript
import * as d3 from 'd3';

// Ordinal scale with custom colors
const colorScale = d3.scaleOrdinal()
  .domain(['Technology', 'Healthcare', 'Finance'])
  .range(['#3498db', '#2ecc71', '#e74c3c']);

const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: colorScale
});

// Using built-in D3 color schemes
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: d3.scaleOrdinal(d3.schemeCategory10)
});

// Categorical scale that automatically assigns colors
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'value',
  color: d3.scaleOrdinal(d3.schemeSet3)
});
```

## How Color Detection Works

The library automatically detects the type of color configuration:

1. **D3 Scales**: Detected by presence of `domain` or `range` properties
   - Passes sector → category → index string to the scale
2. **Multi-parameter Functions**: Detected by `function.length > 1`
   - Passes `(dataObject, index)` to the function
3. **Single-parameter Functions**: Functions with `function.length === 1`
   - Passes the full data object to the function

## Key Determination for D3 Scales

When using D3 scales, the system automatically extracts appropriate keys from your data:

1. **First priority**: `sector` property
2. **Second priority**: `category` property  
3. **Fallback**: Index as string

```typescript
// Data with sector - uses sector for scale
const data = [
  { name: 'Apple', value: 100, sector: 'Technology' },
  { name: 'Walmart', value: 90, sector: 'Retail' }
];

// Data with category - uses category for scale
const data = [
  { name: 'Item A', value: 100, category: 'Type1' },
  { name: 'Item B', value: 90, category: 'Type2' }
];

// Data without sector/category - uses index for scale
const data = [
  { name: 'Item A', value: 100 }, // Index 0
  { name: 'Item B', value: 90 }   // Index 1
];
```

## Real-World Examples

### Fortune 1000 Company Visualization

```typescript
const companyData = [
  { name: 'Apple', sector: 'Technology', profits: 94680 },
  { name: 'Amazon', sector: 'Retailing', profits: 33364 },
  { name: 'Microsoft', sector: 'Technology', profits: 72361 }
];

const sectorColorMap = {
  'Technology': '#2563eb',
  'Health Care': '#059669',
  'Retailing': '#dc2626',
  'Financials': '#7c3aed',
  'Energy': '#ea580c'
};

const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'profits',
  color: d => sectorColorMap[d.sector] || '#6b7280'
});
```

### Performance-Based Coloring

```typescript
const chart = createBubbleChart('#chart', {
  label: 'name',
  size: 'revenue',
  color: d => {
    const growthRate = d.growth || 0;
    if (growthRate > 0.2) return '#22c55e'; // High growth - green
    if (growthRate > 0.1) return '#eab308'; // Medium growth - yellow
    if (growthRate > 0) return '#f97316';   // Low growth - orange
    return '#ef4444'; // Negative growth - red
  }
});
```

## Best Practices

### 1. Consistent Color Mapping
```typescript
// Good: Define colors once, use everywhere
const BRAND_COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  accent: '#e74c3c',
  neutral: '#95a5a6'
};

const SECTOR_COLORS = {
  'Technology': BRAND_COLORS.primary,
  'Healthcare': BRAND_COLORS.secondary,
  'Finance': BRAND_COLORS.accent
};
```

### 2. Accessibility
```typescript
// Color-blind friendly palette
const colorBlindSafePalette = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
];

const chart = createBubbleChart('#chart', {
  color: d3.scaleOrdinal(colorBlindSafePalette)
});
```

### 3. Performance
```typescript
// Pre-compute expensive color calculations
const colorCache = new Map();

const chart = createBubbleChart('#chart', {
  color: d => {
    if (!colorCache.has(d.id)) {
      colorCache.set(d.id, expensiveColorCalculation(d));
    }
    return colorCache.get(d.id);
  }
});
```

## Troubleshooting

### Colors Not Working
- Check console for errors
- Verify color functions return valid CSS color strings
- Ensure D3 scales have proper domain/range setup

### Performance Issues
- Avoid expensive calculations in color functions
- Use memoization for complex color logic
- Pre-compute color mappings when possible

### Accessibility Issues
- Test with color-blind simulation tools
- Ensure sufficient contrast ratios
- Consider using patterns or shapes alongside colors
