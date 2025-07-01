# Testing Strategy - Bubble Chart Library

This document outlines the comprehensive, unified testing approach for the bubble chart library. Our strategy prioritises clear separation of concerns, minimal duplication, and easy execution for both users and developers.

## 🎯 Testing Philosophy

**Minimal but Complete**: Each test serves a specific purpose with no duplication
**User-Friendly**: Both users and Claude can easily run tests and understand results  
**Behaviour-Focused**: Tests verify what the library does, not how it does it
**Fast Feedback**: Quick smoke tests for immediate verification, comprehensive tests for thorough validation

## 🏃‍♂️ Quick Start

```bash
# one command does it all
npm test   # alias for npm run test:all
```

This single runner performs:

1. Smoke sanity check
2. Jest unit suites
3. Integration script (Node-based)

Runtime ≈ 45 s.

## 📦 What Gets Exercised

| Stage | Tool | What it verifies |
|-------|------|------------------|
| Smoke | node scripts/smoke-test.js | Library imports, basic render, cleanup |
| Unit  | Jest | Core logic, type guards, store, processors |
| Integration | node scripts/test-integration.js | Real usage scenarios, performance checks |

Browser and visual tests remain manual (`npm run dev` → navigate to test files) for deep UI verification.

## 🛠️ Developer Workflow

• During dev: `npm test` for full sweep (≈45 s).  Most IDEs can re-run Jest only for faster feedback.

• Pre-commit / CI: `npm test` plus `npm run build`.

## 📋 Test Commands Summary

| Command | Purpose | Runtime | Usage |
|---------|---------|---------|-------|
| `npm run test:smoke` | Quick verification | 5s | After builds, debugging |
| `npm run test:unit` | Core components | 15s | Development, CI/CD |
| `npm run test:integration` | Real scenarios (Node.js) | 30s | Pre-commit, CI/CD |
| `npm run dev` + navigate to `tests/integration-test.html` | Real scenarios (Browser) | Manual | Debugging integration issues |
| `npm run dev` + navigate to `tests/browser-test.html` | Visual verification | Manual | Final validation |
| `npm run test:all` | Unit + Integration | 45s | Comprehensive check |
| `npm run test:quick` | Alias for smoke | 5s | Quick alias |

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

Access at: `npm run dev` → navigate to `tests/browser-test.html`

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
npm run dev  # Navigate to tests/integration-test.html
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
npm run dev  # Navigate to tests/integration-test.html
```

**Virtual DOM limitations with D3/SVG**
```bash
# When JSDOM can't properly handle D3 operations:
npm run dev  # Navigate to tests/integration-test.html

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
4. **Try browser tests** for visual debugging - `npm run dev` → navigate to `tests/browser-test.html`
5. **Check integration tests** - `npm run test:integration`

### Getting Help

**For Users:**
- Run `npm run test:smoke` for quick issue identification
- Use `npm run dev` → navigate to `tests/browser-test.html` for visual problem diagnosis
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