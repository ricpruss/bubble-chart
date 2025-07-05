# Fluent API Design – v3.0 Final

> **Status:** ✅ Implementation Complete & Production Ready  
> **Target:** Single, clean fluent API with intelligent defaults  
> **Principle:** Simple things simple, complex things possible

---

## Implementation Status

### ✅ **COMPLETED & TESTED**
1. **Core Fluent Builder** - `BubbleChartBuilder` class in `src/reactive/chart.ts`
2. **BubbleChart.create()** static method working
3. **Data Intelligence** - Auto-detection of size, label, color fields
4. **Animation Presets** - 'gentle', 'smooth', 'energetic', 'bouncy' presets
5. **Smart Tooltips** - Automatic tooltip generation
6. **Streaming API** - Real-time data updates with enter/update/exit animations
7. **Examples Updated** - `animation-showcase.html`, `phase2a-demo.html`, `streaming-api-demo.html`
8. **Event Handling System** - Modern `.onBubble()` API with automatic event re-attachment

### ✅ **COMPLETED & TESTED** 
9. **Legacy API Removal** - ✅ Removed ConfigBuilder and all deprecated functions
10. **Centralized Configuration** - ✅ Single source of truth in types/config.ts
11. **Core Examples Migration** - ✅ Updated simple, tree, liquid, gauge, motion, orbit, list, wave examples to fluent API
12. **Documentation Update** - ✅ Updated CONFIG.md and README.md to reflect fluent-only API
13. **UMD Bundle Fix** - ✅ Fixed UMD entry to export fluent API as primary interface (simple.html now working)
14. **Build & Test Verification** - ✅ All smoke tests and integration tests passing (100% success rate)
15. **Wave/Liquid Percentage API** - ✅ Added `withPercentage()` method to fluent API for wave and liquid charts
16. **Event System Fix** - ✅ Fixed timing issue with `.onBubble()` event registration and attachment

### ✅ **COMPLETED & TESTED**
17. **Event System Documentation** - ✅ Complete documentation with practical examples
18. **Production Ready** - ✅ Clean, performant implementation without debugging overhead
19. **Advanced Examples Migration** - ✅ Updated size-toggle.html, typescript-usage.html, reactive-basic.html, and streaming-api-demo.html to fluent API
20. **setSizeMetric() Method** - ✅ Working dynamic size field switching with `.setSizeMetric()`
21. **Streaming API Integration** - ✅ Modern `.withStreaming()` with automatic enter/exit animations
22. **Complex Demo Migration** - ✅ Full Fortune 1000 streaming demo with custom tooltips and interactive features

### ❌ **FUTURE ENHANCEMENTS**
1. **Test Files Migration** - Update remaining test files to use fluent API (browser-test.html, integration-test.html)
2. **Enhanced Testing** - Add more comprehensive test coverage for edge cases
3. **Performance Optimization** - Profile and optimize fluent API performance 
4. **Advanced Data Sources** - Complete WebSocket, Polling, Observable integration
5. **Additional Chart Types** - Extend fluent API to more visualization types

---

## Design Philosophy

**One API to Rule Them All** – Everything uses the same fluent builder pattern:

```typescript
// 90% of use cases: One line with intelligent defaults
const chart = BubbleChart.create('#chart').withData(companies).render();

// Complex cases: Progressive enhancement with events
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')
  .withLabel('company') 
  .withColor('sector')
  .withAnimations('gentle')
  .withTooltips(['company', 'sector', 'revenue'])
  .withDimensions(800, 600)
  .render()
  .onBubble('click', d => console.log('Clicked:', d.company))
  .onBubble('mouseenter', d => console.log('Hovered:', d.company));
```

## Core API Structure

### 1. **Creation & Data (Required)**
```typescript
BubbleChart.create(container: string)
  .withData(data: T[])        // Auto-detects best label/size/color fields
  .render()                   // Returns BubbleChart instance
```

### 2. **Data Mapping (Optional Override)**
```typescript
.withSize(field: string | function)     // Override auto-detected size
.withLabel(field: string | function)    // Override auto-detected label  
.withColor(field: string | function)    // Override auto-detected color
.withTime(field: string | function)     // Add temporal dimension
```

### 3. **Visual Configuration (Optional)**
```typescript
.withDimensions(width: number, height: number)
.withType('bubble' | 'tree' | 'orbit' | 'motion' | 'list')
.withTooltips(mode: 'auto' | string[] | TooltipConfig)
```

### 4. **Behavior (Optional)**
```typescript
.withAnimations(preset: AnimationPresetName | AnimationConfig)
.withStreaming(options?: StreamingOptions)
.withGrouping(field: string)            // Auto-assigns colors by group
```

### 5. **Event Handling (After Render)**
```typescript
.onBubble('click', (data, event, element) => { ... })     // DOM events on bubbles
.onBubble('mouseenter', handler)                          // Mouse enter events
.onBubble('mouseleave', handler)                          // Mouse leave events
.on('change', (stats) => { ... })                        // Lifecycle events
```

### 6. **Data Sources (Advanced)**
```typescript
.fromObservable(observable: Observable<T[]>)
.fromWebSocket(config: WebSocketConfig)
.fromPolling(config: PollingConfig)
.fromEventSource(config: EventSourceConfig)
```

## Intelligent Defaults System

### Auto-Detection Logic
```typescript
// Input: Fortune 1000 companies data
const companies = [
  { Company: "Apple", Revenue: 383285, Sector: "Technology", CEO: "Tim Cook" },
  // ...
];

// One line creates fully functional chart:
BubbleChart.create('#chart').withData(companies).render();

// Auto-detects:
// - size: 'Revenue' (largest numeric field)
// - label: 'Company' (unique text field)  
// - color: 'Sector' (categorical field with 2-20 unique values)
// - animations: 'smooth' (based on data size)
// - tooltips: ['Company', 'Sector', 'Revenue'] (key fields)
// - dimensions: container size or 500x500
```

### Progressive Override
```typescript
// Override only what you need:
BubbleChart.create('#chart')
  .withData(companies)
  .withSize('MarketCap')      // Use market cap instead of revenue
  .withAnimations('energetic') // Faster animations
  .render();
```

## Complete API Reference

```typescript
interface FluentBubbleChart<T> {
  // === REQUIRED ===
  withData(data: T[]): FluentBubbleChart<T>;
  render(): BubbleChart<T>;
  
  // === DATA MAPPING ===
  withSize(field: keyof T | ((d: T) => number)): this;
  withLabel(field: keyof T | ((d: T) => string)): this;
  withColor(field: keyof T | ((d: T) => string) | ColorScale): this;
  withTime(field: keyof T | ((d: T) => number)): this;
  withPercentage(fn: (d: T) => number): this;
  
  // === VISUAL ===
  withDimensions(width: number, height: number): this;
  withType(type: ChartType): this;
  withTooltips(config: 'auto' | 'none' | string[] | TooltipConfig): this;
  
  // === BEHAVIOR ===
  withAnimations(preset: AnimationPresetName | AnimationConfig): this;
  withStreaming(options?: StreamingOptions): this;
  withGrouping(field: keyof T): this;        // Auto-color by group
  
  // === DATA SOURCES ===
  fromObservable(source: Observable<T[]>): this;
  fromWebSocket(config: WebSocketConfig): this;
  fromPolling(config: PollingConfig): this;
  fromEventSource(config: EventSourceConfig): this;
  
  // === ADVANCED ===
  withCustomConfig(config: Partial<BubbleChartOptions>): this;
}

interface BubbleChart<T> {
  // === RUNTIME CONTROL ===
  readonly store: DataStore<T>;
  
  // === CONFIGURATION ===
  options(): Readonly<BubbleChartOptions<T>>;
  updateOptions(options: Partial<BubbleChartOptions<T>>): this;
  
  // === FLUENT UPDATES ===
  setSize(field: keyof T | ((d: T) => number)): this;
  setLabel(field: keyof T | ((d: T) => string)): this; 
  setColor(field: keyof T | ((d: T) => string)): this;
  setAnimations(preset: AnimationPresetName | AnimationConfig): this;
  setTooltips(config: 'auto' | 'none' | string[] | TooltipConfig): this;
  
  // === CONTROL ===
  redraw(): this;
  destroy(): void;
  
  // === EVENTS ===
  on(event: string, handler: (data: any) => void): this;           // Lifecycle events
  off(event: string, handler: (data: any) => void): this;
  onBubble(event: string, handler: (data: T, event: MouseEvent, element: SVGElement) => void): this;  // DOM events
  
  // === INTELLIGENCE ===
  inspectData(): DataIntelligenceInsights;
}
```

## Usage Examples

### Simple Cases (90% of usage)
```typescript
// Minimal - auto-detects everything
const chart = BubbleChart.create('#chart').withData(companies).render();

// Override size metric  
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('marketCap')
  .render();

// Add streaming
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withStreaming()
  .render();
```

### Medium Complexity
```typescript
// Custom visual styling
const chart = BubbleChart.create('#chart')
  .withData(companies)
  .withSize('revenue')
  .withColor(d => sectorColors[d.sector])
  .withAnimations('bouncy')
  .withDimensions(800, 600)
  .render();

// Wave chart with percentage
const waveChart = BubbleChart.create('#wave-chart')
  .withData(elements)
  .withType('wave')
  .withPercentage(d => d.completion / 100)
  .render();

// Liquid chart with profit margin
const liquidChart = BubbleChart.create('#liquid-chart')
  .withData(companies)
  .withType('liquid')
  .withPercentage(d => d.profits / d.revenue)
  .render();

// Time-series data
const chart = BubbleChart.create('#chart')
  .withData(timeSeriesData)
  .withTime('year')
  .withType('motion')
  .withTooltips(['company', 'year', 'revenue'])
  .render();
```

### Advanced Cases  
```typescript
// Live data streaming
const chart = BubbleChart.create('#chart')
  .withData(initialData)
  .withStreaming({ 
    enterAnimation: { duration: 800, stagger: 50 },
    keyFunction: d => d.id 
  })
  .fromWebSocket({ 
    url: 'ws://api.company.com/live-data',
    reconnect: true,
    transform: response => response.companies
  })
  .withTooltips({
    mode: 'custom',
    fields: ['company', 'sector', 'revenue', 'change'],
    formatters: { revenue: formatCurrency, change: formatPercent }
  })
  .render();

// Observable binding
const dataObservable = new BehaviorSubject(companies);
const chart = BubbleChart.create('#chart')
  .fromObservable(dataObservable)
  .withAnimations('gentle')
  .render();
```

## Implementation Strategy

### Phase 1: Core Fluent Builder
```typescript
// File: src/fluent/bubble-chart-builder.ts
export class FluentBubbleChartBuilder<T extends BubbleChartData> {
  private container: string;
  private config: Partial<BubbleChartOptions<T>> = {};
  private dataSource?: T[];
  
  constructor(container: string) {
    this.container = container;
  }
  
  withData(data: T[]): this {
    this.dataSource = data;
    
    // Apply data intelligence
    const insights = DataIntelligence.inspectData(data);
    this.config = {
      ...this.config,
      label: insights.suggested.label,
      size: insights.suggested.size,
      color: this.createColorScale(data, insights.suggested.color),
      animation: AnimationPresets.forDataSize(data.length),
      tooltip: this.createSmartTooltips(insights)
    };
    
    return this;
  }
  
  withSize(field: keyof T | ((d: T) => number)): this {
    this.config.size = field;
    return this;
  }
  
  // ... other methods
  
  render(): BubbleChart<T> {
    const finalConfig = {
      container: this.container,
      ...this.config
    };
    
    const chart = new BubbleChartFacade<T>(finalConfig);
    
    if (this.dataSource) {
      chart.store.addMany(this.dataSource);
    }
    
    return chart;
  }
}
```

### Phase 2: Reactive Extensions
```typescript
// Add reactive data source methods
fromObservable(source: Observable<T[]>): this {
  this.config.dataSource = { type: 'observable', source };
  return this;
}

fromWebSocket(config: WebSocketConfig): this {
  this.config.dataSource = { type: 'websocket', config };
  return this;
}
```

### Phase 3: Advanced Features  
```typescript
// Grouping with auto-color assignment
withGrouping(field: keyof T): this {
  this.config.colour = field;
  this.config.color = this.createGroupColorScale(field);
  return this;
}

// Streaming configuration
withStreaming(options?: StreamingOptions): this {
  this.config.streaming = { enabled: true, ...options };
  return this;
}
```

## Entry Points

### Primary (Fluent)
```typescript
// Main export - fluent builder
export class BubbleChart {
  static create<T>(container: string): FluentBubbleChartBuilder<T> {
    return new FluentBubbleChartBuilder<T>(container);
  }
}
```

### Legacy Support (Deprecated)
```typescript
// Deprecated - will be removed in v4
export function createBubbleChart<T>(
  container: string, 
  options: BubbleChartOptions<T>
): BubbleChart<T> {
  console.warn('createBubbleChart is deprecated. Use BubbleChart.create().withData().render()');
  return new BubbleChartFacade<T>(options);
}
```

## Migration Path

### Step 1: Implement Core Builder ✅ **COMPLETE**
- [x] Create `BubbleChartBuilder` class in `src/reactive/chart.ts`
- [x] Implement required methods: `withData()`, `render()`
- [x] Add data intelligence integration
- [x] Test with simple examples

### Step 2: Add Data Mapping Methods ✅ **COMPLETE**
- [x] Implement `withSize()`, `withLabel()`, `withColor()`, `withTime()`
- [x] Add override logic for auto-detected fields
- [x] Test field detection and overrides

### Step 3: Add Visual Configuration ✅ **COMPLETE**
- [x] Implement `withDimensions()`, `withType()`, `withTooltips()`
- [x] Add animation system: `withAnimations()`
- [x] Test visual configuration options

### Step 4: Add Behavioral Features ✅ **COMPLETE**
- [x] Implement `withStreaming()`, `withGrouping()`
- [x] Add streaming configuration
- [x] Test grouping and color assignment

### Step 5: Add Data Sources 🔄 **IN PROGRESS**
- [x] Implement `fromObservable()`, `fromWebSocket()`, `fromPolling()`  
- [x] Add reactive data source handling
- [ ] Test live data scenarios
- [ ] Polish error handling and reconnection

### Step 6: Migration & Cleanup 🔄 **IN PROGRESS**
- [x] Update key examples to use fluent API (animation-showcase, phase2a-demo, streaming-api-demo)
- [ ] **Remove old configuration approaches (ConfigBuilder, legacy APIs)**
- [ ] **Update ALL remaining examples to use fluent API**
- [ ] **Centralize configuration in single BubbleChartOptions interface**
- [ ] Update documentation and CONFIG.md

## Success Criteria

1. **Simple Case**: `BubbleChart.create('#chart').withData(data).render()` works perfectly with intelligent defaults
2. **Progressive Enhancement**: Each additional method adds specific functionality without breaking defaults
3. **Type Safety**: Full TypeScript support with intelligent inference
4. **Performance**: No degradation from current implementation
5. **Migration**: Clear path from any existing API to fluent API
6. **Documentation**: Every method has clear purpose and examples

---

*This design prioritizes developer experience with intelligent defaults while maintaining full flexibility for advanced use cases.* 