# Physics-Based Charts & Streaming Updates

## Current Limitation

**Motion** and **Orbit** charts use continuous physics simulations (d3-force, d3-timer) that are not compatible with the discrete enter/update/exit streaming update system.

## Affected Chart Types

- `MotionBubble` - Uses d3-force simulation for gravity-based movement
- `OrbitBuilder` - Uses d3-timer for orbital motion around center

## Current Behavior

These charts fall back to full re-render when data changes:

```typescript
// Current workaround in reactive facade:
if (this.builder instanceof MotionBubble) {
  this.builder.data(currentData).render(); // Full re-render
}
else if (this.builder instanceof OrbitBuilder) {
  this.builder.data(currentData).render(); // Full re-render  
}
```

## Future Enhancement

See `REACTIVE_IMPLEMENTATION.md` Phase 2B for planned streaming support:

- Streaming-aware force simulation updates
- Physics-based enter/update/exit animations
- Unified animation interface

## Files

- `src/reactive/chart.ts` - Contains current workaround
- `src/motion-bubble.ts` - d3-force implementation
- `src/orbit-builder.ts` - d3-timer implementation
