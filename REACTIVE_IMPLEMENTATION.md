# Reactive API Implementation Plan

**Status**: ✅ Phase 2A Complete - Intelligent Core API Enhanced  
**Target**: Intelligent reactive experience that "just works"  
**Priority**: Developer Experience > Performance (expecting ~100-2000 bubbles)

## Quick Summary

Transform manual data management into intelligent, automatic reactive flows:

```typescript
// Before: Manual updates required
chart.data(newData).update();

// After: Intelligent reactive patterns
const chart = BubbleChart.create('#chart')
  .withData(companies)           // Auto-detects best label/size fields
  .groupBy('sector')             // Auto-assigns colors by group
  .enableStreaming()             // Built-in enter/update/exit animations
  .render();

// Multiple data patterns supported
chart.bindTo(dataObservable);                    // Observable binding
chart.streamFrom({ websocket: 'ws://api.com' }); // Data sources
chart.setSizeMetric('revenue');                  // Dynamic metric switching
```

**Core Principle**: **Intelligent by Default, Configurable When Needed**

---

## Implementation Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Observable implementation and reactive base classes
- [x] Store-based data management with automatic re-rendering
- [x] Factory pattern (`BubbleChart.createBubbleChart()`)
- [x] Build system integration and backward compatibility

### ✅ Phase 2A: Core API Enhancement (COMPLETED)
**Goal**: Fix immediate pain points, add intelligence

- [x] **Bulk Store Operations**
  ```typescript
  chart.store.addMany(items);
  chart.store.removeMany(keys);
  chart.store.replaceWith(data);
  chart.store.updateWhere(predicate, changes);
  // Also includes: filter, find, where, has, get
  ```

- [x] **Data Intelligence**
  ```typescript
  const insights = chart.inspectData();
  // Returns: { suggested: { size: 'Revenue', label: 'Company', color: 'Sector' },
  //           quality: { score: 85, issues: [...] }, 
  //           fields: { numeric: [...], categorical: [...] } }
  
  chart.setSizeMetric('Revenue');     // Switch to revenue-based sizing
  chart.setSizeMetric('MarketCap');   // Switch to market cap
  chart.setSizeMetric('Employees');   // Switch to headcount
  ```

- [x] **Smart Tooltips**
  ```typescript
  chart.setTooltip('auto');  // Intelligent field selection
  chart.setTooltip(['Company', 'Sector', 'CEO', 'Revenue']);
  chart.setTooltip(config);  // Full TooltipConfig object
  // Smart formatters for currency, percentages, dates
  ```

- [x] **Animation Presets**
  ```typescript
  chart.setAnimations('gentle');     // Slow, smooth transitions
  chart.setAnimations('energetic');  // Fast, bouncy animations  
  chart.setAnimations('minimal');    // Quick, subtle changes
  
  // Data-size optimized presets
  const animations = AnimationPresets.forDataSize(data.length);
  chart.setAnimations(animations);
  
  // Use-case specific presets
  chart.setAnimations(AnimationPresets.forUseCase('dashboard'));
  ```

- [x] **Enhanced Factory API**
  ```typescript
  // Intelligent factory with auto-detection
  const chart = BubbleChart.create('#chart')
    .withData(companies)        // Auto-detects best fields
    .setAnimations('gentle')    // Preset animations
    .render();
  ```

### 📋 Phase 2B: Observable Integration (Weeks 3-4)
**Goal**: True reactive data binding

- [ ] **Enhanced Observable Binding**
  ```typescript
  chart.bindTo(dataObservable);
  chart.bindTo(fetch('/api/data').then(r => r.json()));
  chart.bindTo(asyncDataFunction);
  ```

- [ ] **Data Source Factory**
  ```typescript
  chart.streamFrom({
    websocket: { url: 'ws://api.com/data', reconnect: true },
    transform: data => data.companies
  });
  
  chart.streamFrom({
    polling: { url: '/api/companies', interval: 5000 },
    transform: response => response.data
  });
  
  chart.streamFrom({
    events: { target: window, event: 'custom-data' }
  });
  ```

- [ ] **Error Handling & Resilience**
  ```typescript
  chart.on('stream:error', error => handleError(error));
  chart.on('stream:reconnected', () => showReconnectedMessage());
  chart.on('data:quality-warning', issues => showDataWarnings(issues));
  ```

### 📋 Phase 2C: Enhanced Store Operations (Weeks 5-6)
**Goal**: Powerful data manipulation

- [ ] **Query Operations**
  ```typescript
  const techCompanies = chart.store.filter(d => d.sector === 'Technology');
  const topCompany = chart.store.find(d => d.rank === 1);
  const profitable = chart.store.where(d => d.profits > 0);
  ```

- [ ] **Computed Properties**
  ```typescript
  const topTenByRevenue = chart.store.computed(
    data => data.sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  );
  
  chart.bindTo(topTenByRevenue); // Automatically updates
  ```

- [ ] **Memory Management**
  ```typescript
  chart.store.setRetentionPolicy({ 
    maxItems: 1000, 
    strategy: 'FIFO' 
  });
  ```

- [ ] **Intelligent Text Placement** (e.g., Tree Bubble parent & leaf labels)

### 📋 Phase 2D: Framework Integration (Weeks 7-8)
**Goal**: Seamless framework experience

- [ ] **React Integration**
  ```tsx
  const { ref, chart } = useBubbleChart(data, {
    label: 'name',
    size: 'value',
    animations: 'gentle'
  });
  
  return <div ref={ref} />;
  ```

- [ ] **Vue Integration**
  ```vue
  <script setup>
  const { chartRef, chart } = useBubbleChart(data, config);
  </script>
  <template>
    <div ref="chartRef"></div>
  </template>
  ```

- [ ] **Enhanced TypeScript Support**
  - Better generic type inference for data shapes
  - Configuration validation at compile time
  - Runtime type guards for data quality

---

## Target Developer Experience

### Intelligent Defaults
```typescript
// Minimal configuration, maximum intelligence
const chart = BubbleChart.create('#chart')
  .withData(companies)  // Auto-detects: label='Company', size='Revenue', key='Company'
  .render();            // Auto-assigns colors by sector, creates smart tooltips
```

### Progressive Enhancement
```typescript
// Add streaming when needed
chart.enableStreaming()
  .streamFrom({ polling: '/api/data' });

// Customize when needed  
chart.setAnimations('energetic')
  .setSizeMetric('marketCap')
  .setTooltip(['Company', 'CEO', 'Revenue']);
```

### Real-World Data Intelligence
```typescript
// Handle complex datasets automatically
const insights = chart.inspectData(fortune1000Data);
console.log(insights);
// {
//   fields: { numeric: ['Revenue', 'MarketCap'], categorical: ['Sector'] },
//   suggested: { size: 'Revenue', color: 'Sector', label: 'Company' },
//   quality: { missingValues: 12, outliers: 3, duplicates: 0 }
// }

// Switch between metrics seamlessly
chart.setSizeMetric('Revenue');     // $648B - $20M range
chart.setSizeMetric('MarketCap');   // Different scaling
chart.setSizeMetric('Employees');   // 2M - 1K range
```

---

## Architecture Principles

1. **Intelligent Defaults**: API should work great with minimal configuration
2. **Progressive Disclosure**: Simple things simple, complex things possible  
3. **Data-Aware**: Built-in understanding of common data patterns and issues
4. **Observable-First**: Charts subscribe to data, data never "pulls" the chart
5. **Framework-Agnostic**: Core API works everywhere, with framework-specific enhancements
6. **Zero Breaking Changes**: Evolutionary, not revolutionary API design
7. **Composable Core**: Small, orthogonal modules; pure helpers over monoliths

---

## Success Metrics

### Developer Experience Goals (Primary Focus)
- [ ] **Time to productivity**: New users create working streaming chart in <5 minutes
- [ ] **Reduction in boilerplate**: 80% less code for common streaming scenarios  
- [ ] **Intelligent configuration**: 90% of charts work well with auto-detected settings
- [ ] **Clear error messages**: Data quality issues automatically detected and reported

### API Quality Goals
- [ ] **Discoverability**: IntelliSense provides helpful completions and documentation
- [ ] **Type safety**: Full TypeScript support with intelligent inference
- [ ] **Data validation**: Automatic detection and reporting of data quality issues
- [ ] **Flexibility**: Easy escape hatches for complex customization

### Performance Goals (Secondary)
- [ ] **No regression**: <5% slower than current API for typical use cases
- [ ] **Smooth animations**: 60fps during updates for expected data sizes (100-2000 bubbles)
- [ ] **Memory efficiency**: Stable memory usage for typical streaming scenarios
- [ ] **Bundle size**: <15KB addition to core library (gzipped)

---

## Breaking Changes Policy

**Zero Breaking Changes**: All existing APIs continue to work:

```typescript
// v1 API (preserved)
const chart = new BubbleChart({ container: '#chart', label: 'name', size: 'value' });
chart.data(data).update();

// v1.5 API (preserved)  
const chart = BubbleChart.createBubbleChart('#chart', config);
chart.store.add(item);

// v2 API (new)
const chart = BubbleChart.create('#chart').withData(data).enableStreaming();
```

---

## Testing Strategy

Following repository rules for mandatory verification:

### Build & Test Requirements
- **Every change**: `npm run build` + `npm run test:smoke` 
- **Core changes**: `npm run test:unit`
- **API changes**: `npm run test:integration`
- **Visual changes**: `npm run test:browser`

### Test Coverage Focus
- **Data Intelligence**: Field detection, quality validation, smart defaults
- **Observable Integration**: Subscription management, error handling, cleanup
- **Animation System**: Preset configurations, timing controls, stagger effects
- **Store Operations**: Bulk operations, query methods, computed properties
- **Framework Integration**: React/Vue hooks, TypeScript inference

### Real-World Scenarios
- Fortune 1000 dataset streaming (1000 companies, 30+ fields)
- Multiple size metric switching (Revenue → MarketCap → Employees)  
- WebSocket connection management (reconnection, error handling)
- Memory usage over extended streaming sessions

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|---------|------------|
| API complexity creep | High | Strict scope control, intelligent defaults |
| Developer adoption resistance | Medium | Preserve existing APIs, gradual migration |
| Data intelligence accuracy | Medium | Extensive testing with real datasets |
| Framework integration complexity | Medium | Start simple, iterate based on feedback |

---

## Current Status: Phase 1 Complete ✅

**Foundation Implemented:**
- ✅ Observable system and reactive base classes
- ✅ Store-based data management with automatic re-rendering  
- ✅ Factory pattern and backward compatibility
- ✅ Build system integration
- ✅ Real-world data testing (Fortune 1000 dataset)

**Latest Completion**: Phase 2A - Core API Enhancement ✅

## Phase 2A Completion Summary (July 1, 2025)

**Accomplished:**
- ✅ Enhanced Store Operations: Added `removeMany`, `replaceWith`, `updateWhere`, plus query methods (`filter`, `find`, `where`, `has`, `get`)
- ✅ Data Intelligence Module: Complete field analysis, data quality scoring, and intelligent configuration suggestions
- ✅ Smart Tooltips System: Automatic tooltip generation with intelligent field selection and formatting
- ✅ Animation Presets: 7 predefined animation configurations with data-size and use-case optimization
- ✅ Enhanced Factory API: Fluent builder pattern with intelligent defaults and auto-detection

**Key Features Delivered:**
1. **Intelligent Data Analysis**: Automatic field type detection, quality assessment, and configuration recommendations
2. **Smart Formatting**: Currency, percentage, date, and number formatters with automatic selection
3. **Performance-Optimized Animations**: Different presets for different data sizes and use cases
4. **Enhanced Developer Experience**: One-line chart creation with intelligent field detection

**Testing Status:**
- ✅ Build System: All TypeScript compilation successful
- ✅ Smoke Tests: 7/7 tests passing
- ✅ Unit Tests: 99/99 tests passing  
- ✅ Integration Tests: 21/21 tests passing
- ✅ Demo Created: Complete Phase 2A feature demonstration (`examples/tests/phase2a-demo.html`)

**Performance:**
- Execution time: 7.38ms for 100 data points (Excellent)
- Zero breaking changes to existing APIs
- Backward compatibility maintained

**Next Phase**: Phase 2B - Observable Integration (Enhanced reactive data binding) 