# Bubble Chart Configuration

Modern fluent API with intelligent defaults.

## Quick Start

```typescript
import { BubbleChart } from 'bubble-chart';

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

## Fluent API Reference

### Required Methods
```typescript
BubbleChart.create(container: string)      // Create chart builder
  .withData(data: T[])                     // Set data (auto-detects fields)
  .render()                                // Build and render chart
```

### Data Mapping (Override Auto-Detection)
```typescript
.withSize('revenue' | d => d.marketCap)    // Size field or function
.withLabel('company' | d => d.name)        // Label field or function  
.withColor('sector' | d => colors[d.type]) // Color field or function
.withTime('year')                          // Time field for motion charts
.withPercentage(d => d.value / 100)        // Percentage for wave/liquid charts
```

### Visual Configuration
```typescript
.withDimensions(800, 600)                  // Chart width and height
.withType('bubble' | 'tree' | 'motion')    // Chart type
.withTooltips(['name', 'sector', 'revenue']) // Tooltip fields
.withTooltips('auto')                      // Auto-generated tooltips
```

### Behavior & Animation
```typescript
.withAnimations('gentle' | 'energetic' | 'smooth' | 'bouncy')
.withAnimations({ 
  enter: { duration: 800, stagger: 50 },
  update: { duration: 600 },
  exit: { duration: 400 }
})
.withStreaming()                           // Enable live updates
.withGrouping('sector')                    // Auto-color by field
```

### Advanced Data Sources
```typescript
.fromObservable(dataStream)                // Reactive data binding
.fromWebSocket({ url: 'ws://api.com' })    // WebSocket data
.fromPolling({ url: '/api/data' })         // Polling data source
```

## Usage Examples

### Basic Visualization
```typescript
// Minimal configuration - intelligent defaults
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .render();

// The above auto-detects:
// - size: largest numeric field (e.g., 'revenue')  
// - label: unique text field (e.g., 'company')
// - color: categorical field (e.g., 'sector')
// - animations: optimized for data size
// - tooltips: key fields automatically
```

### Custom Configuration
```typescript
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('marketCap')                   // Use market cap for sizing
  .withLabel(d => `${d.company} (${d.ceo})`) // Custom label function
  .withColor('sector')                     // Color by sector  
  .withAnimations('bouncy')                // Playful animations
  .withDimensions(1000, 700)               // Custom size
  .withTooltips(['company', 'sector', 'marketCap', 'ceo'])
  .render();
```

### Streaming Data
```typescript
const chart = BubbleChart.create('#chart')
  .withData(initialData)
  .withStreaming({
    enterAnimation: { duration: 1000, stagger: 100 },
    keyFunction: d => d.id
  })
  .fromWebSocket({
    url: 'ws://api.company.com/live-data',
    reconnect: true,
    transform: response => response.companies
  })
  .render();
```

### Time-Series Animation
```typescript
const chart = BubbleChart.create('#chart')
  .withData(timeSeriesData)
  .withTime('year')                        // Animate over time
  .withType('motion')                      // Motion chart type
  .withTooltips(['company', 'year', 'revenue', 'employees'])
  .render();
```

### Wave and Liquid Charts
```typescript
// Wave bubbles with custom percentage calculation
const waveChart = BubbleChart.create('#wave-chart')
  .withData(elements)
  .withType('wave')
  .withPercentage(d => d.completion / 100)  // Fill level based on completion
  .render();

// Liquid gauge with profit margin calculation
const liquidChart = BubbleChart.create('#liquid-chart')
  .withData(companies)
  .withType('liquid')
  .withPercentage(d => d.profits / d.revenue)  // Profit margin as fill level
  .render();
```

## Runtime Control

After creating a chart, use these methods for dynamic updates:

```typescript
// Data manipulation
chart.store.add(newCompany);
chart.store.remove(d => d.id === 'AAPL');
chart.store.updateWhere(d => d.sector === 'Tech', { color: 'blue' });

// Configuration changes
chart.setSize('employees');                // Switch size metric
chart.setAnimations('energetic');          // Change animation style
chart.setTooltips(['name', 'revenue']);    // Update tooltips

// Advanced
chart.updateOptions({ width: 1200 });     // Direct config update
chart.redraw();                            // Force re-render
```

## Data Intelligence

The library automatically analyzes your data to provide intelligent defaults:

```typescript
// Inspect what the library detected
const insights = chart.inspectData();
console.log(insights);

// Example output:
// {
//   suggested: {
//     size: 'Revenue',        // Best numeric field for sizing
//     label: 'Company',       // Best text field for labels
//     color: 'Sector'         // Best categorical field for colors
//   },
//   fields: {
//     numeric: ['Revenue', 'MarketCap', 'Employees'],
//     categorical: ['Sector', 'Country'],
//     text: ['Company', 'CEO']
//   },
//   quality: {
//     score: 85,              // Data quality score (0-100)
//     issues: ['12 missing values in Revenue']
//   }
// }
```

## Animation Presets

Built-in animation presets optimized for different use cases:

| Preset | Use Case | Description |
|--------|----------|-------------|
| `'gentle'` | Dashboards | Slow, smooth transitions |
| `'energetic'` | Presentations | Fast, bouncy animations |
| `'smooth'` | General use | Balanced timing |
| `'bouncy'` | Interactive | Playful spring effects |
| `'minimal'` | Performance | Quick, subtle changes |
| `'none'` | Static | No animation |

```typescript
// Use preset
chart.withAnimations('gentle');

// Or customize
chart.withAnimations({
  enter: { duration: 1200, stagger: 80, easing: 'ease-out' },
  update: { duration: 800, easing: 'ease-in-out' },
  exit: { duration: 600, easing: 'ease-in' }
});
```

## Event Handling

The library provides two types of event handling:

### DOM Events (Bubble Interactions)
Use `.onBubble()` for mouse and click events on individual bubbles:

```typescript
const chart = BubbleChart.create('#chart')
  .withData(data)
  .render()
  .onBubble('click', (data, event, element) => {
    console.log(`Clicked: ${data.company}`);
    console.log('Event:', event);
    console.log('SVG Element:', element);
  })
  .onBubble('mouseenter', (data) => {
    console.log(`Hovering: ${data.company}`);
  })
  .onBubble('mouseleave', (data) => {
    console.log(`Left: ${data.company}`);
  })
  .onBubble('mouseover', (data) => {
    console.log(`Mouse over: ${data.company}`);
  })
  .onBubble('mouseout', (data) => {
    console.log(`Mouse out: ${data.company}`);
  });
```

### Lifecycle Events
Use `.on()` for chart lifecycle events:

```typescript
chart
  .on('change', (stats) => {
    console.log(`Data changed - Added: ${stats.added}, Removed: ${stats.removed}`);
  })
  .on('render', () => {
    console.log('Chart rendered');
  })
  .on('destroy', () => {
    console.log('Chart destroyed');
  });
```

### Event Handler Signatures

**DOM Events (`onBubble`)**:
```typescript
handler: (data: T, event: MouseEvent, element: SVGElement) => void
```

**Lifecycle Events (`on`)**:
```typescript
handler: (payload: any) => void
```

### Practical Examples

**Interactive Bubble Selection**:
```typescript
let selectedBubble = null;

const chart = BubbleChart.create('#chart')
  .withData(companies)
  .render()
  .onBubble('click', (data, event, element) => {
    // Toggle selection
    if (selectedBubble === data.id) {
      selectedBubble = null;
      element.style.stroke = 'none';
    } else {
      selectedBubble = data.id;
      element.style.stroke = '#ff0000';
      element.style.strokeWidth = '3px';
    }
  });
```

**Custom Tooltips with Events**:
```typescript
const tooltip = d3.select('body').append('div')
  .attr('class', 'custom-tooltip')
  .style('opacity', 0);

chart
  .onBubble('mouseover', (data, event) => {
    tooltip.transition().duration(200).style('opacity', 0.9);
    tooltip.html(`<strong>${data.company}</strong><br/>Revenue: $${data.revenue}M`)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 28) + 'px');
  })
  .onBubble('mouseout', () => {
    tooltip.transition().duration(500).style('opacity', 0);
  });
```

## Configuration System

The library uses a centralized configuration system with intelligent defaults:

```typescript
// Minimal - relies on intelligent field detection
const chart = BubbleChart.create('#chart')
  .withData(dataset)  // Auto-detects optimal label, size, and color fields
  .render();

// Progressive enhancement - override specific aspects  
const chart = BubbleChart.create('#chart')
  .withData(dataset)
  .withLabel('customName')           // Override auto-detected label
  .withSize('customValue')           // Override auto-detected size
  .withAnimations('energetic')       // Add custom animation preset
  .render();

// Advanced - full customization
const chart = BubbleChart.create('#chart')
  .withData(dataset)
  .withCustomConfig({                // Direct config object for edge cases
    tooltip: { mode: 'detailed', maxFields: 8 },
    streaming: { bufferSize: 1000 },
    performance: { useWebGL: true }
  })
  .render();
```

## Complete Example

```typescript
import { BubbleChart } from 'bubble-chart';

// Fortune 1000 companies data
const companies = [
  { company: "Apple", revenue: 383285, sector: "Technology", ceo: "Tim Cook" },
  { company: "Walmart", revenue: 648125, sector: "Retail", ceo: "Doug McMillon" },
  // ...
];

// Create intelligent chart with minimal configuration and events
const chart = BubbleChart.create('#chart')
  .withData(companies)              // Auto-detects: label=company, size=revenue, color=sector
  .withAnimations('gentle')         // Smooth animations
  .withTooltips(['company', 'sector', 'revenue', 'ceo'])
  .render()
  .onBubble('click', (data) => {
    alert(`${data.company}: $${data.revenue}M revenue`);
  })
  .onBubble('mouseenter', (data, event, element) => {
    element.style.strokeWidth = '2px';
    element.style.stroke = '#333';
  })
  .onBubble('mouseleave', (data, event, element) => {
    element.style.stroke = 'none';
  })
  .on('change', (stats) => {
    console.log(`Data updated: ${stats.total} total companies`);
  });

// Dynamic updates
document.getElementById('revenue-btn').onclick = () => {
  chart.setSize('revenue');
};

document.getElementById('add-company').onclick = () => {
  chart.store.add({ 
    company: "NewCorp", 
    revenue: 50000, 
    sector: "Technology", 
    ceo: "Jane Doe" 
  });
};
```

---

*The fluent API prioritizes intelligent defaults while maintaining full flexibility for advanced use cases.* 