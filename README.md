# Bubble Chart

A modern TypeScript library for creating interactive bubble visualizations with intelligent defaults and a D3-native, fluent API.

## History
This started with https://github.com/mbaez/bubbles-chart but has mainly been a vehicle for me to learn to code again using AI.
The goal was to move a code base to a different style of API in  a different language.

## Install

```bash
npm install bubble-chart
```

## Overview

Bubble Chart provides a suite of features for creating rich, interactive data visualizations:

- **Intelligent Defaults**: Automatically determines optimal fields for labels, sizing, and colors
- **Fluent API**: Supports method chaining for easy configuration
- **Multiple Chart Types**: Bubble, tree, motion, orbital, liquid, and more
- **Real-time Updates**: Stream data seamlessly with smooth animations
- **Smart Tooltips**: Auto-generated tooltips with data insight
- **TypeScript Native**: Offers full type safety
- **Animation Presets**: Built-in styles tailored for different use cases

For detailed configuration options and examples, see the [Configuration Guide](docs/CONFIG.md).


## Getting Started

```typescript
import BubbleChart from 'bubble-chart';

// Create a chart with intelligent defaults
const chart = BubbleChart.create('#chart')
  .withSize('revenue')
  .withColor('sector')
  .withAnimations('gentle')
  .withDimensions(800, 600)
  .build();

// Update with data to render the chart
chart.update(companies);

// Add event handlers
chart.on('click', (data) => console.log(`Clicked: ${data.name}`));
```

## Examples

Launch the development server to explore a range of examples:

```bash
npm run dev
# Visit http://localhost:3333/examples/
```

## Testing

Bubble Chart comes with a robust testing suite:

```bash
npm test
```

For more details and advanced configurations, refer to the [Configuration Guide](docs/CONFIG.md).

## License

MIT
