# Bubble Chart

A modern TypeScript library for creating interactive bubble visualizations with intelligent defaults and a fluent API.

## Install

```bash
npm install bubble-chart
```

## Quick Start

```typescript
import BubbleChart from 'bubble-chart';

const companies = [
  { name: "Apple", revenue: 383285, sector: "Technology" },
  { name: "Walmart", revenue: 648125, sector: "Retail" },
  { name: "Amazon", revenue: 513983, sector: "Technology" }
];

// Simple: Auto-detects best fields for labels, sizing, and colors
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .render();

// Enhanced: Override specific fields  
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')
  .withAnimations('gentle')
  .render();
```

## Features

✨ **Intelligent Defaults** - Auto-detects optimal fields for labels, sizing, and colors  
🎯 **Fluent API** - Method chaining with progressive enhancement  
📊 **Multiple Chart Types** - Bubble, tree, motion, orbital, liquid, and more  
🔄 **Real-time Updates** - Streaming data support with smooth animations  
🎨 **Smart Tooltips** - Automatic tooltip generation with data intelligence  
⚡ **TypeScript Native** - Full type safety with intelligent inference  
🎭 **Animation Presets** - Built-in animation styles optimized for different use cases

## Fluent API

### Basic Usage
```typescript
// Minimal configuration - intelligent defaults
BubbleChart.create('#chart')
  .withData(dataset)
  .render();
```

### Data Mapping
```typescript
BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')                    // Size by revenue
  .withLabel('name')                      // Label by company name
  .withColor('sector')                    // Color by sector
  .withTime('year')                       // Animate over time
  .render();
```

### Visual Configuration
```typescript
BubbleChart.create('#chart')
  .withData(companies)
  .withDimensions(800, 600)               // Custom dimensions
  .withType('motion')                     // Chart type
  .withAnimations('energetic')            // Animation preset
  .withTooltips(['name', 'sector', 'revenue'])
  .render();
```

### Streaming Data
```typescript
BubbleChart.create('#chart')
  .withData(initialData)
  .withStreaming()
  .fromWebSocket({ url: 'ws://api.com/live' })
  .render();
```

## Chart Types

**Standard Bubbles** - Classic bubble chart with size-based visualization
```typescript
BubbleChart.create('#chart')
  .withData(data)
  .withType('bubble')
  .render();
```

**Tree/Hierarchy** - Nested bubble structures for hierarchical data
```typescript
BubbleChart.create('#chart')
  .withData(hierarchicalData)
  .withType('tree')
  .render();
```

**Motion Charts** - Time-series animation with smooth transitions
```typescript
const chart = BubbleChart.create('#chart')
  .withData(timeSeriesData)
  .withType('motion')
  .withTime('year')
  .render();

// Motion charts support spatial filtering
const builder = chart.getBuilder();
builder.triggerSpatialFilter('region');  // Cluster bubbles by region
builder.triggerSpatialFilter();          // Reset to original layout
```

**Orbital Motion** - Bubbles with orbital physics animations
```typescript
BubbleChart.create('#chart')
  .withData(data)
  .withType('orbit')
  .render();
```

**Wave Animation** - Animated wave fill effects
```typescript
BubbleChart.create('#chart')
  .withData(data)
  .withType('wave')
  .render();
```

**Liquid Gauge** - Liquid-filled bubble gauges
```typescript
BubbleChart.create('#chart')
  .withData(data)
  .withType('liquid')
  .render();
```

## Animation Presets

Choose from optimized animation presets:

- `'gentle'` - Slow, smooth transitions for dashboards
- `'energetic'` - Fast, bouncy animations for presentations  
- `'smooth'` - Balanced timing for general use
- `'bouncy'` - Playful spring effects for interactive demos
- `'minimal'` - Quick, subtle changes for performance
- `'none'` - No animation for static charts

```typescript
BubbleChart.create('#chart')
  .withData(data)
  .withAnimations('bouncy')
  .render();
```

## Data Intelligence

The library automatically analyzes your data to provide intelligent defaults:

```typescript
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .render();

// Inspect what was auto-detected
const insights = chart.inspectData();
console.log(insights.suggested); 
// { size: 'revenue', label: 'name', color: 'sector' }
```

## Runtime Control

Dynamic updates after chart creation:

```typescript
// Data manipulation
chart.store.add(newCompany);
chart.store.remove(d => d.id === 'AAPL');
chart.store.updateWhere(d => d.sector === 'Tech', { highlighted: true });

// Configuration changes
chart.setSize('marketCap');
chart.setAnimations('gentle');
chart.setTooltips(['name', 'marketCap']);
```

## TypeScript Support

Full type safety with intelligent inference:

```typescript
interface Company {
  name: string;
  revenue: number;
  sector: string;
  founded: number;
}

const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')                    // Type-safe field access
  .withLabel(d => `${d.name} (${d.founded})`) // Type-safe functions
  .render();
```

## Examples

Explore comprehensive examples organized by complexity:

### Quick Start
```bash
npm run dev
# Visit http://localhost:3333/examples/
```

### Example Categories

**📋 Simple Examples** - Basic demonstrations of each chart type with clean, minimal code

**🚀 Advanced Examples** - Complex implementations with interactive features, streaming data, and real-world scenarios

**🦧 Automated Testing** - Comprehensive test suite with detailed console logging for development

Visit [examples/index.html](examples/index.html) for the complete interactive catalog, or use `npm run dev` to run the development server with live reloading.

## Configuration

For detailed configuration options, see [CONFIG.md](docs/CONFIG.md).

## Testing

```bash
npm run test:smoke      # Quick verification
npm run test:unit       # Core functionality
npm run test:integration # Full scenarios
npm run test:browser    # Visual verification
```

## License

MIT
