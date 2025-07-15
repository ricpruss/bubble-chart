# Bubble Chart Library - Claude Code Guide

This guide helps Claude Code instances understand and work effectively with the bubble-chart codebase.

## Quick Reference

### Common Commands
```bash
# Development (starts Vite dev server on localhost:3333)
npm run dev

# Build library and examples
npm run build

# Run all tests
npm run test

# Type checking
npm run type-check

# Build only examples (TypeScript → JavaScript)
npm run build-examples
```

### Key URLs
- **Dev Server**: http://localhost:3333/examples/
- **Main Examples**: http://localhost:3333/examples/index.html
- **Advanced Demos**: http://localhost:3333/examples/advanced/

## Architecture Overview

### Core Library Structure (`src/`)

**`core/`** - Foundation layer with D3-native building blocks:
- `BaseChartBuilder` - Abstract base for all chart types
- `SVGManager` - SVG element creation and management  
- `DataProcessor` - Data transformation pipeline
- `InteractionManager` - Event handling
- `RenderingPipeline` - D3 rendering operations

**`builders/`** - Chart type implementations using builder pattern:
- `BuilderFactory` - Factory for chart type selection
- Individual builders: `BubbleBuilder`, `TreeBuilder`, `OrbitBuilder`, `MotionBubble`, etc.
- `shared/` - Common pipeline utilities

**`d3/`** - D3.js utilities and color palettes

**`config/`** - Configuration management with backward compatibility

### Examples System

**HTML Examples** - Basic usage demonstrations
**`advanced/`** - TypeScript examples requiring compilation
**`js/`** - Compiled TypeScript output for browser usage (git-ignored)
**`data/`** - Sample datasets for examples

### Build System

- **Rollup** builds multiple targets: CommonJS, ES modules, UMD
- **Vite** development server with hot reload and no-cache headers
- **TypeScript** compilation for both library and examples
- **Examples compilation** via `scripts/build-examples.js`

## Key Patterns & Conventions

### 1. Fluent API Design
```typescript
BubbleChart.create('#container')
  .withData(data)
  .withSize('revenue')
  .withLabel('name')
  .withAnimations('gentle')
  .render();
```

### 2. Builder Pattern with Factory
```typescript
// Factory selects appropriate builder
const config = { type: 'motion', data: timeSeries };
const chart = BuilderFactory.create(config);
```

### 3. D3-Native Approach
- Direct D3 selections and data joins
- No wrapper overhead
- Event attachment directly to D3 elements
- Uses D3's enter/update/exit pattern

### 4. TypeScript-First Design
- Strict typing throughout
- Generic support for data shapes
- Comprehensive type exports from `src/types/`

### 5. Modular Core Architecture
- Composition over inheritance
- Separation of concerns
- Unified building blocks shared across chart types

## Working with Examples

### TypeScript Examples Workflow
1. Edit `.ts` files in `examples/advanced/`
2. Run `npm run build-examples` to compile
3. HTML files import from `../js/compiled-file.js`
4. Vite dev server auto-reloads on changes

### Example Types
- **Basic**: Simple HTML/JS demonstrations
- **Advanced**: TypeScript with complex data processing
- **Streaming**: Real-time data with WebSocket support
- **Interactive**: User controls and dynamic updates

### Notification System
- Use `showClickNotification()` from shared utilities
- **Never use `alert()`** - causes D3 performance violations
- Import from `../js/notification-utils.js` for HTML examples
- TypeScript version available in `advanced/notification-utils.ts`

## Data Structures

### Supported Data Types
- **FlatBubbleData** - Basic categorical data (companies, products)
- **HierarchicalBubbleData** - Tree structures with children
- **TimeSeriesBubbleData** - Temporal data for motion charts
- **EconomicTimeSeriesData** - Simplified economic indicators

### Common Fields
- `label` - Display text
- `size` - Bubble sizing value
- `category`/`type` - Grouping/coloring
- `year` - Temporal filtering
- `amount`/`value` - Alternative size fields

## Testing

### Test Types
- **Unit**: Component-level (`__tests__/` directories)
- **Integration**: Cross-component functionality
- **Smoke**: Basic verification
- **Interactive**: Manual HTML-based testing

### Test Execution
```bash
npm test              # All tests
```

## Development Guidelines

### File Organization
- Co-locate tests with source (`__tests__/` pattern)
- Use TypeScript for all new code
- Follow existing naming conventions
- Import types from `src/types/`

### Code Style
- Use existing patterns and utilities
- Check neighboring files for conventions
- Maintain D3-native approach
- Follow fluent API patterns for new features

### Build Considerations
- Library builds to `dist/` (multiple formats)
- Examples compile to `examples/js/` (git-ignored)
- Vite serves examples with no-cache headers
- Hot reload works for both library and examples

### Performance
- Use D3's efficient data joining
- Avoid blocking operations like `alert()`
- Leverage animation presets: `gentle`, `energetic`, `smooth`, `bouncy`, `minimal`, `none`
- Test with streaming data for performance validation

## Common Tasks

### Adding New Chart Type
1. Create builder in `src/builders/new-type-builder.ts`
2. Extend `BaseChartBuilder`
3. Register in `BuilderFactory`
4. Add TypeScript types if needed
5. Create example in `examples/`

### Adding New Example
1. Create HTML file in appropriate directory
2. For TypeScript: create `.ts` file in `advanced/`
3. Use shared notification utilities
4. Test with `npm run dev`
5. Add entry to `examples/index.html`

### Debugging Issues
1. Check browser console for errors
2. Verify TypeScript compilation: `npm run type-check`
3. Rebuild examples: `npm run build-examples`
4. Check Vite cache: start dev server with `--force`
5. Inspect D3 selections and data joins

## Important Notes

### Git Workflow
- `examples/js/` is git-ignored (compiled output)
- Never commit compiled TypeScript
- Use meaningful commit messages
- Test before committing

### Dependencies
- **Core**: D3.js v7+ (peer dependency)
- **Dev**: Rollup, TypeScript, Vite, Jest
- **Runtime**: Minimal - just D3 for users

### Browser Support
- ES2020+ for examples
- Broader compatibility for distributed library
- Uses modern D3 patterns and APIs

This codebase represents a mature, well-architected TypeScript library with comprehensive examples, efficient build system, and modern development practices.