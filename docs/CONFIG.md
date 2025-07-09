# Bubble Chart Configuration

**D3-Native Fluent API** with intelligent defaults, automatic rendering, and streaming support.

## Quick Start

```typescript
import { BubbleChart } from 'bubble-chart';

// 🚀 D3-Native: Auto-renders when data is bound
const chart = BubbleChart.create('#chart')
  .withData(companies)  // ✨ Chart renders automatically!
  .build();             // Returns live chart

// Enhanced: Override specific fields and add interactions
const chart = BubbleChart.create('#chart')
  .withData(companies)   // ✨ Auto-renders immediately
  .withSize('revenue')
  .withColor('sector')
  .withAnimations('gentle')
  .withDimensions(800, 600)
  .build()               // Returns live chart instance
  .on('click', (data) => console.log(`Clicked: ${data.name}`));
```

## 🚀 D3-Native Philosophy

This library embraces D3's core principle: **data drives the DOM**. Charts render automatically when data is bound, using D3's native enter/update/exit patterns.

### Key D3-Native Concepts:
- **Automatic Rendering**: Charts render when `.withData()` is called
- **Streaming Updates**: Use `.update()` for smooth data transitions
- **Key Functions**: Essential for proper D3 data binding
- **Enter/Update/Exit**: D3's natural data lifecycle
- **Declarative API**: Describe what you want, not how to render it

```typescript
// ✅ D3-Native Pattern (Recommended)
const chart = BubbleChart.create('#chart')
  .withData(companies)  // ✨ Auto-renders here!
  .withKey(d => d.id)   // ✨ Key function for data binding
  .build();             // Returns live chart

// For streaming updates:
let currentData = [];
currentData.push(newCompany);
chart.update(currentData);  // ✨ D3-native streaming
```

## Fluent API Reference

### Core Methods - D3-Native Patterns
```typescript
BubbleChart.create(container: string)      // Create chart builder
  .withData(data: T[])                     // Bind data (triggers auto-render)
  .build()                                 // Returns live chart instance

// 🚀 D3-Native: Charts render automatically when data is bound!
// For streaming updates, use chart.update(newData)
```

### Data Mapping (Override Auto-Detection)
```typescript
.withSize('revenue' | d => d.marketCap)    // Size field or function
.withLabel('company' | d => d.name)        // Label field or function  
.withColor('sector' | d => colors[d.type]) // Color field or function
.withKey(d => d.id)                        // Key function for D3 data binding
.withTime('year')                          // Time field for motion charts
.withPercentage(d => d.value / 100)        // Percentage for wave/liquid charts
```

### Visual Configuration
```typescript
.withDimensions(800, 600)                  // Chart width and height
.withType('bubble' | 'tree' | 'motion' | 'wave' | 'liquid' | 'orbit' | 'list')
.withTooltips(['name', 'sector', 'revenue']) // Tooltip fields
.withTooltips('auto')                      // Auto-generated tooltips
```

### Behavior & Animation
```typescript
.withAnimations('gentle' | 'energetic' | 'smooth' | 'bouncy')
.withAnimations({ 
  enter: { duration: 800, stagger: 50, easing: 'ease-out' },
  update: { duration: 600, easing: 'ease-in-out' },
  exit: { duration: 400, easing: 'ease-in' }
})
```

## Usage Examples

### Basic Visualization - D3-Native Data Binding
```typescript
// Minimal configuration - intelligent defaults with auto-rendering
const chart = BubbleChart.create('#chart')
  .withData(companies)  // 🚀 Data binding triggers immediate render
  .build();             // Returns live chart (already rendered)

// D3-native auto-detection:
// ✓ size: largest numeric field (e.g., 'revenue')  
// ✓ label: unique text field (e.g., 'company')
// ✓ color: categorical field (e.g., 'sector')
// ✓ animations: optimized for data size
// ✓ tooltips: key fields automatically
// ✓ rendering: automatic on data binding (D3 pattern)
```

### Custom Configuration - D3-Native Fluent API
```typescript
const chart = BubbleChart.create('#chart')
  .withData(companies)                     // 🚀 Auto-renders on data binding
  .withSize('marketCap')                   // Use market cap for sizing
  .withLabel(d => `${d.company} (${d.ceo})`) // Custom label function
  .withColor('sector')                     // Color by sector  
  .withAnimations('bouncy')                // Playful spring effects
  .withDimensions(1000, 700)               // Custom dimensions
  .withTooltips(['company', 'sector', 'marketCap', 'ceo'])
  .build();                                // Returns rendered chart instance

// 🚀 D3-Native: No manual .render() needed - data binding triggers rendering!
```

### D3-Native Streaming Updates
```typescript
// Create chart for streaming with key function - essential for D3 data binding
const chart = BubbleChart.create('#chart')
  .withLabel('name')
  .withSize('revenue')
  .withColor('sector')
  .withKey(d => d.id)                      // ✨ Key function prevents screen clearing!
  .withAnimations({
    enter: { duration: 1000, stagger: 100, easing: 'ease-out' },
    update: { duration: 800, easing: 'ease-in-out' },
    exit: { duration: 600, easing: 'ease-in' }
  })
  .build();                              // Create empty chart for streaming

// 🚀 D3-Native Streaming: Manage data array and call update()
let currentData = [];

// Add single item
currentData.push(newCompany);
chart.update(currentData);              // ✨ Smooth streaming update

// Add multiple items
currentData.push(...moreCompanies);
chart.update(currentData);              // ✨ Batch update with staggered animations

// Remove item
const index = currentData.findIndex(d => d.id === 'MSFT');
currentData.splice(index, 1);
chart.update(currentData);              // ✨ Smooth exit animation

// Clear all data
currentData = [];
chart.update(currentData);              // ✨ Clear with exit animations

// Listen to data changes
chart.on('change', (stats) => {
  console.log(`Updated: +${stats.entered}, ~${stats.updated}, -${stats.exited}`);
});
```

### Motion Charts - D3-Native Physics Simulation
```typescript
const chart = BubbleChart.create('#chart')
  .withData(companies)                     // 🚀 Auto-renders motion chart
  .withType('motion')                      // Motion chart with physics
  .withSize('revenue')
  .withColor('sector')
  .withAnimations('smooth')
  .build();                                // Returns live animated chart
```

### Wave and Liquid Charts - D3-Native Fluid Animations
```typescript
// Wave bubbles with custom percentage calculation - auto-renders
const waveChart = BubbleChart.create('#wave-chart')
  .withData(elements)                      // 🚀 Auto-renders wave animations
  .withType('wave')
  .withPercentage(d => d.completion / 100) // Fill level based on completion
  .build();                                // Returns live wave chart

// Liquid gauge with profit margin calculation - auto-renders
const liquidChart = BubbleChart.create('#liquid-chart')
  .withData(companies)                     // 🚀 Auto-renders liquid gauge
  .withType('liquid')
  .withPercentage(d => d.profits / d.revenue) // Profit margin as fill level
  .build();                                // Returns live liquid gauge
```

### Hierarchical Data - Tree Charts
```typescript
const treeChart = BubbleChart.create('#tree-chart')
  .withData(hierarchicalData)              // 🚀 Auto-renders tree structure
  .withType('tree')
  .withLabel('label')
  .withSize('amount')
  .withColor('category')
  .withAnimations('gentle')
  .build();                                // Returns live tree chart
```

### Orbit Charts - Planetary Motion
```typescript
const orbitChart = BubbleChart.create('#orbit-chart')
  .withData(planets)                       // 🚀 Auto-renders orbital motion
  .withType('orbit')
  .withLabel('name')
  .withSize('mass')
  .withColor('type')
  .build();                                // Returns live orbit chart
```

## Runtime Control

After creating a chart, use these methods for dynamic updates:

```typescript
// D3-Native Data Updates (Recommended)
// Manage your data array and call chart.update()
let currentData = [...];

// Add single item
currentData.push(newCompany);
chart.update(currentData);                      // Smooth streaming update

// Add multiple items
currentData.push(...moreCompanies);
chart.update(currentData);                      // Batch update with staggered animations

// Update existing item
const index = currentData.findIndex(d => d.id === 'AAPL');
currentData[index] = { ...currentData[index], revenue: 400000 };
chart.update(currentData);                      // Smooth transition

// Remove item
const removeIndex = currentData.findIndex(d => d.id === 'MSFT');
currentData.splice(removeIndex, 1);
chart.update(currentData);                      // Smooth exit animation

// Clear all data
currentData = [];
chart.update(currentData);                      // Clear with exit animations

// Chart Lifecycle
chart.destroy();                                 // Clean up and remove chart
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

The library provides D3-native event handling for both bubble interactions and chart lifecycle events:

### DOM Events (Bubble Interactions)
Use `.on()` for mouse and click events on individual bubbles:

```typescript
const chart = BubbleChart.create('#chart')
  .withData(data)
  .build();

// D3-native event handlers
chart.on('click', (data, event, element) => {
  console.log(`Clicked: ${data.company}`);
  console.log('Event:', event);
  console.log('SVG Element:', element);
});

chart.on('mouseenter', (data, event, element) => {
  console.log(`Hovering: ${data.company}`);
  element.style.strokeWidth = '2px';
  element.style.stroke = '#333';
});

chart.on('mouseleave', (data, event, element) => {
  console.log(`Left: ${data.company}`);
  element.style.stroke = 'none';
});

chart.on('mouseover', (data, event, element) => {
  console.log(`Mouse over: ${data.company}`);
});

chart.on('mouseout', (data, event, element) => {
  console.log(`Mouse out: ${data.company}`);
});
```

### Lifecycle Events
Use `.on()` for chart lifecycle events:

```typescript
chart.on('change', (stats) => {
  console.log(`Data changed - Entered: ${stats.entered}, Updated: ${stats.updated}, Exited: ${stats.exited}`);
});

chart.on('render', () => {
  console.log('Chart rendered');
});

chart.on('destroy', () => {
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

## Testing and Debugging

The library includes comprehensive automated tests that demonstrate proper usage:

### Automated Test Examples

```typescript
// Basic rendering test
const chart = BubbleChart.create('#chart')
  .withLabel('name')
  .withSize('value')
  .withDimensions(600, 400)
  .withColor(d3.scaleOrdinal(d3.schemeCategory10))
  .withData(testData)
  .render();

// Verify rendering
setTimeout(() => {
  const circles = document.querySelectorAll('#chart circle');
  console.log(`Rendered ${circles.length} bubbles`);
  
  circles.forEach((circle, i) => {
    const r = circle.getAttribute('r');
    const opacity = getComputedStyle(circle).opacity;
    console.log(`Bubble ${i}: radius=${r}, opacity=${opacity}`);
  });
}, 1000);
```

### Data Update Testing

```typescript
// Test reactive store updates
const chart = BubbleChart.create('#chart')
  .withData(initialData)
  .withStreaming({
    keyFunction: d => d.id,
    enterAnimation: { duration: 800, stagger: 50 }
  })
  .render();

// Test data manipulation
chart.store.clear();
chart.store.addMany(newData);

// Verify update
setTimeout(() => {
  const circles = document.querySelectorAll('#chart circle');
  console.log(`After update: ${circles.length} circles`);
}, 1200);
```

### Event Testing

```typescript
// Test event handling
const chart = BubbleChart.create('#chart')
  .withData(testData)
  .render()
  .onBubble('click', (data, event, element) => {
    console.log(`Clicked: ${data.name} at (${event.clientX}, ${event.clientY})`);
    console.log(`Element radius: ${element.getAttribute('r')}`);
  })
  .onBubble('mouseover', (data, event, element) => {
    element.style.opacity = '0.7';
    console.log(`Hovering: ${data.name}`);
  })
  .onBubble('mouseout', (data, event, element) => {
    element.style.opacity = '1.0';
    console.log(`Left: ${data.name}`);
  });

// Programmatically trigger events for testing
const firstBubble = document.querySelector('#chart circle');
const clickEvent = new MouseEvent('click', {
  bubbles: true,
  clientX: 100,
  clientY: 100
});
firstBubble.dispatchEvent(clickEvent);
```

### Animation Testing

```typescript
// Monitor D3 transitions for debugging
let transitionCount = 0;
const originalTransition = d3.selection.prototype.transition;
d3.selection.prototype.transition = function() {
  transitionCount++;
  console.log(`D3 Transition #${transitionCount} with ${this.size()} elements`);
  return originalTransition.apply(this, arguments);
};

// Create chart with animation monitoring
const chart = BubbleChart.create('#chart')
  .withData(testData)
  .withAnimations({
    enter: { duration: 800, stagger: 50, easing: 'ease-out' },
    update: { duration: 600, easing: 'ease-in-out' },
    exit: { duration: 400, easing: 'ease-in' }
  })
  .render();

console.log(`Chart configuration:`, chart.options());
console.log(`Total transitions called: ${transitionCount}`);
```

---

*The fluent API prioritizes intelligent defaults while maintaining full flexibility for advanced use cases.*
