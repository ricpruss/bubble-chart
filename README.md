# Bubble Chart

What began as play with [mbaez's motion-bubble.js](https://github.com/mbaez/bubbles-chart/blob/master/src/js/motion-bubble.js) and exploration through vibe coding tools has crystallized into something sharper: a TypeScript library that makes data dance.

Bubbles emerge from arrays with the kind of fluid intelligence that anticipates your needs. Default behaviors learned from patterns in thousands of datasets. A fluent API that reads like conversation.

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

// The library reads your data, chooses wisely
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .render();

// Or guide its decisions
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')
  .withAnimations('gentle')
  .render();
```

## What It Does

✨ **Intelligent Defaults** - Reads your data structure, selects optimal fields  
🎯 **Fluent API** - Method chaining that feels like natural language  
📊 **Multiple Expressions** - Bubble, tree, motion, orbital, liquid forms  
🔄 **Live Updates** - Streaming data with seamless transitions  
🎨 **Smart Tooltips** - Context-aware information display  
⚡ **TypeScript Native** - Full type safety with intelligent inference  
🎭 **Animation Presets** - Timing and easing optimized for different contexts

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
npm test                # Run comprehensive test suite (smoke + unit + integration)
```

For interactive testing, use the browser examples via `npm run dev`.

## License

MIT
