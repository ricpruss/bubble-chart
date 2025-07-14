# When We Zoom

## Current Progress

- **Removal of getContrastTextColor Function**: Simplification of text color handling by removing the `getContrastTextColor` function.
- **Fluent API Enhancement**: Introduction of `getTextColor()` and `setTextColor()` methods in the `BaseChartBuilder` for fluent API usage.
- **Centralized Text Rendering**: Implemented `renderLabels()` in `ChartPipeline` to centralize text rendering logic across various chart builders.
- **Integration into Builders**: Updated the following builders to use `ChartPipeline.renderLabels()` for text rendering:
  - `bubble-builder`
  - `motion-bubble`
  - `wave-bubble`
  - `liquid-bubble`

## Centralized Text Rendering Method Details

### SVG Structure Integration
- Text elements are appended inside each bubble group (`<g>` elements) that have `transform` attributes for positioning.
- Utilizes D3 data binding and join patterns to create a single `<text>` element per bubble group.

### Relative Positioning
- Uses `text-anchor: middle` and `dominant-baseline: central` for positioning.
- Font size is calculated based on the bubble radius, ensuring text size relates to the bubble size.

## Zoom and Pan Compatibility
- Labels move and scale consistently with their parent bubbles thanks to translations and potential scales applied to groups.
- Supports typical D3 zoom and pan behaviors that transform these groups, ensuring labels zoom and pan as expected.

## Future Enhancements
- Optionally adjust font sizes or toggle label visibility based on zoom scale for a better zoom experience.

## Conclusion
`ChartPipeline.renderLabels()` is well-structured to comply with D3 best practices and will integrate smoothly with zoom and pan features.
