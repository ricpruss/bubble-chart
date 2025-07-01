# Bubble Chart

A TypeScript library for creating interactive bubble visualizations with D3.js.

## Install

```bash
npm install bubble-chart
```

## Quick Start

```javascript
import { BubbleChart } from 'bubble-chart';

const data = [
  { name: "JavaScript", value: 100, usage: 85 },
  { name: "Python", value: 80, usage: 70 },
  { name: "Java", value: 65, usage: 60 }
];

const chart = new BubbleChart({
  container: "#chart",
  label: "name",
  size: "value"
});

chart.data(data);
```

## Chart Types

**Standard Bubbles**
```javascript
new BubbleChart({ type: "bubble" })
```

**Wave Animation** - Animated wave fill based on percentage
```javascript
new BubbleChart({ 
  type: "wave",
  percentage: d => d.usage / 100
})
```

**Tree/Hierarchy** - Nested bubble structures
```javascript
const treeData = {
  label: "Company",
  children: [
    { label: "Engineering", amount: 120,
      children: [
        { label: "Frontend", amount: 40 },
        { label: "Backend", amount: 50 }
      ]
    }
  ]
};
new BubbleChart({ type: "tree", size: "amount" })
```

**Orbital Motion** - Bubbles with orbital animations
```javascript
new BubbleChart({ type: "orbit" })
```

Plus: `liquid`, `motion` types with various animation effects.

## Timeline Filtering

Filter hierarchical data by time periods:

```javascript
const chart = new BubbleChart({
  type: "tree",
  time: "year"  // data property containing year values
});

// Automatically creates timeline controls
```

## TypeScript

Full type support with generics:

```typescript
interface DataItem {
  label: string;
  size: number;
  percentage: number;
}

const chart = new BubbleChart<DataItem>({
  container: "#chart",
  label: "label", 
  size: "size",
  percentage: d => d.percentage / 100
});
```

## Examples

```bash
npm run demo
```

Visit `/examples/` for:
- Basic usage patterns
- Animation effects  
- Hierarchical data
- Timeline interactions
- TypeScript integration

## License

MIT
