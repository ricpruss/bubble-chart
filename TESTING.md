# Testing Strategy - Bubble Chart Library

This document outlines the comprehensive, unified testing approach for the bubble chart library. Our strategy prioritises clear separation of concerns, minimal duplication, and easy execution for both users and developers.

## 🎯 Testing Philosophy

**Minimal but Complete**: Each test serves a specific purpose with no duplication
**User-Friendly**: Both users and Claude can easily run tests and understand results  
**Behaviour-Focused**: Tests verify what the library does, not how it does it
**Fast Feedback**: Quick smoke tests for immediate verification, comprehensive tests for thorough validation

## 🚀 Test Hierarchy

### **1. Smoke Tests** (`npm run test:smoke`)
- **Purpose**: "Does it work at all?" - Fast verification
- **Runtime**: ~5 seconds
- **Coverage**: Basic instantiation, rendering, cleanup
- **When to use**: After builds, quick verification, first debugging step

```bash
npm run test:smoke
```

**What it tests:**
- ✅ Library imports correctly
- ✅ BubbleBuilder instantiates
- ✅ Data processing works
- ✅ SVG rendering creates elements
- ✅ Method chaining functions
- ✅ Resource cleanup works

### **2. Unit Tests** (`npm run test:unit`)
- **Purpose**: Critical building blocks work correctly
- **Runtime**: ~15 seconds  
- **Coverage**: Core components that must work for anything to function
- **When to use**: Development, CI/CD, debugging specific components

```bash
npm run test:unit
# OR
npm test
```

**What it tests:**
- ✅ Type definitions and validation
- ✅ Configuration handling
- ✅ Data processing edge cases
- ✅ SVG manager core functionality
- ✅ Error handling for critical paths

### **3. Integration Tests** 
- **Purpose**: Real-world scenarios and API compatibility
- **Runtime**: ~30 seconds
- **Coverage**: End-to-end behaviour, performance, compatibility
- **When to use**: Pre-commit, releases, comprehensive verification

**Two approaches available:**

**Option A: Node.js Environment** (`npm run test:integration`)
```bash
npm run test:integration
```
- Runs in virtual DOM (JSDOM) for automated testing
- Best for CI/CD pipelines and automated verification
- Some limitations with complex D3/SVG interactions

**Option B: Real Browser Environment** (`npm run test:integration:browser`)
```bash
npm run test:integration:browser
```
- Runs in actual browser via Vite dev server
- Full DOM and D3 support, no virtual DOM limitations
- Real browser logs and debugging capabilities
- **Recommended for debugging integration issues**

**What both test:**
- ✅ BubbleBuilder API functionality
- ✅ Complex data processing scenarios  
- ✅ Event handling workflows
- ✅ Performance benchmarks
- ✅ Configuration edge cases
- ✅ Real DOM interactions (browser version has more reliable results)

### **4. Browser Tests** (`npm run test:browser`)
- **Purpose**: Visual verification and user interaction testing
- **Runtime**: Manual
- **Coverage**: Visual output, user interactions, responsiveness
- **When to use**: Final verification, UI debugging, release validation

```bash
npm run test:browser
```

**What it tests:**
- 🎨 Visual rendering correctness
- 🖱️ User interaction (click, hover, keyboard)
- 📱 Responsive behaviour
- ⚡ Performance with large datasets
- 🔄 Dynamic data updates

## 📋 Test Commands Summary

| Command | Purpose | Runtime | Usage |
|---------|---------|---------|-------|
| `npm run test:smoke` | Quick verification | 5s | After builds, debugging |
| `npm run test:unit` | Core components | 15s | Development, CI/CD |
| `npm run test:integration` | Real scenarios (Node.js) | 30s | Pre-commit, CI/CD |
| `npm run test:integration:browser` | Real scenarios (Browser) | Manual | Debugging integration issues |
| `npm run test:browser` | Visual verification | Manual | Final validation |
| `npm run test:all` | Unit + Integration | 45s | Comprehensive check |
| `npm run test:quick` | Alias for smoke | 5s | Quick alias |

## 🛠️ Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Build the library (required for most tests)
npm run build

# Optional: verify TypeScript compilation
npm run type-check
```

### Common Workflows

**Quick verification after changes:**
```bash
npm run test:smoke
```

**Development workflow:**
```bash
npm run test:unit        # Test specific components
npm run test:smoke       # Quick overall check
```

**Pre-commit verification:**
```bash
npm run test:all         # Run comprehensive tests
npm run build           # Ensure build works
```

**Release preparation:**
```bash
npm run test:all         # Comprehensive testing
npm run test:browser     # Visual verification
npm run build           # Final build
```

## 📊 Test Coverage Areas

### **Smoke Tests Cover:**
- Library imports and exports
- Basic instantiation patterns
- Simple data processing
- SVG creation and DOM manipulation
- Method chaining API
- Basic cleanup

### **Unit Tests Cover:**
- Type definitions (data types, config types)
- Configuration validation and defaults
- Data processing edge cases (empty data, invalid data)
- SVG manager error handling
- Critical path error conditions

### **Integration Tests Cover:**
- API compatibility between builders
- Complex configuration scenarios
- Real data processing workflows
- Performance regression testing
- Cross-browser compatibility patterns
- Event handling integration

### **Browser Tests Cover:**
- Visual rendering verification
- User interaction testing
- Responsive design behaviour
- Animation and transition testing
- Performance with large datasets

## 🎨 Browser Test Interface

The browser test suite provides an interactive interface for visual verification:

- **Basic Rendering**: Verify standard bubble chart creation
- **Data Updates**: Test dynamic data changes
- **Event Handling**: Test user interactions with real-time logging
- **Performance**: Stress test with 100+ bubbles

Access at: `npm run test:browser`

## 🔧 Writing Tests

### Adding Smoke Tests
```javascript
// In scripts/smoke-test.js
test('New feature basic functionality', () => {
  const builder = new BubbleBuilder(config);
  const result = builder.newFeature();
  if (!result) throw new Error('Feature failed');
});
```

### Adding Unit Tests
```javascript
// In src/core/__tests__/component.test.ts
describe('Component', () => {
  test('should handle edge case', () => {
    const component = new Component(config);
    expect(component.handleEdgeCase()).toBeDefined();
  });
});
```

### Adding Integration Tests
```javascript
// In scripts/test-integration.js (TestRunner class)
async testNewBehaviour(BubbleBuilder) {
  // Test complex real-world scenarios
  const result = await this.runComplexScenario();
  this.addTest('New Behaviour', result, 'Details');
}
```

### Adding Browser Tests
```html
<!-- In examples/tests/browser-test.html -->
<div class="test-section">
  <h2>New Test</h2>
  <button onclick="runNewTest()">Run Test</button>
  <div id="new-chart"></div>
</div>
```

## 🐛 Troubleshooting

### Common Issues

**"Container not found" errors**
```bash
# In Node.js tests, ensure DOM is mocked
global.document = dom.window.document;

# For debugging, use browser-based integration tests
npm run test:integration:browser
```

**"Module not found" errors**
```bash
# Build the library first
npm run build
```

**TypeScript compilation errors**
```bash
# Check types first
npm run type-check
```

**D3 related errors**
```bash
# Ensure D3 mocks are set up in unit tests
jest.spyOn(d3, 'select').mockReturnValue(mockSelection);

# For complex D3 issues, bypass virtual DOM limitations
npm run test:integration:browser
```

**Virtual DOM limitations with D3/SVG**
```bash
# When JSDOM can't properly handle D3 operations:
npm run test:integration:browser

# This runs tests in a real browser via Vite with:
# - Full DOM API support
# - Real SVG rendering
# - Actual browser console logs
# - No D3 mocking required
```

### Test Debugging Steps

1. **Start with smoke tests** - `npm run test:smoke`
2. **Check the build** - `npm run build`
3. **Run unit tests** - `npm run test:unit`
4. **Try browser tests** for visual debugging - `npm run test:browser`
5. **Check integration tests** - `npm run test:integration`

### Getting Help

**For Users:**
- Run `npm run test:smoke` for quick issue identification
- Use `npm run test:browser` for visual problem diagnosis
- Check the console output for specific error messages

**For Developers:**
- Use Jest's `--verbose` flag for detailed unit test output
- Add `console.log` statements in integration tests
- Use browser dev tools with the browser test suite

## 📈 Performance Expectations

### Smoke Tests
- **Target**: < 5 seconds
- **Acceptable**: < 10 seconds
- **Action needed**: > 10 seconds

### Unit Tests
- **Target**: < 15 seconds
- **Acceptable**: < 30 seconds
- **Action needed**: > 30 seconds

### Integration Tests
- **Target**: < 30 seconds
- **Acceptable**: < 60 seconds
- **Action needed**: > 60 seconds

## ✅ Success Criteria

### Smoke Test Success
```
🚀 Bubble Chart Smoke Test
====================================

✅ Library import
✅ BubbleBuilder instantiation
✅ Data processing
✅ SVG rendering
✅ Bubble creation
✅ Method chaining
✅ Event handling
✅ Resource cleanup
✅ BubbleChart compatibility

📊 Results: 9/9 tests passed
🎉 All smoke tests passed! Library is working correctly.
```

### Integration Test Success
```
==================================================
TEST SUMMARY
==================================================
Total Tests: 25
Passed: 25
Failed: 0
Pass Rate: 100.0%
✅ ALL TESTS PASSED - BubbleBuilder is working correctly!

🚀 Performance Results (100 data points):
   Original Builder: 45.23ms
   Modern Builder:   38.67ms
   🎯 Modern is 14.5% faster
```

### Browser Test Success
- All 4 test sections show green "Success" status
- Event log shows interactions working correctly
- Visual charts render as expected
- Performance test completes in reasonable time

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test:all
```

### Pre-commit Hook
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:smoke && npm run build"
    }
  }
}
```

This testing strategy ensures comprehensive coverage while maintaining simplicity and avoiding duplication. Each test level serves a specific purpose and provides clear feedback for different use cases. 