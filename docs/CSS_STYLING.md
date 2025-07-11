# Bubble Chart CSS Styling Guide

This guide explains the CSS-first approach used in the Bubble Chart application, aligning with D3's recommendation to keep styling in CSS rather than in JavaScript. This promotes separation of concerns and better maintainability.

## CSS Variables

We have defined several CSS variables for consistent styling across the application:

```css
:root {
  --bubble-text-color: #ffffff;
  --bubble-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  --bubble-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, ui-sans-serif, Helvetica, Arial, sans-serif;
  --bubble-font-weight: 600;
  --bubble-font-min-size: 10px;
  --bubble-font-max-size: 18px;
  --bubble-canvas-background: #2c3e50;
  --bubble-canvas-border-radius: 8px;
}
```

### Key Styles

- **Typography**: Modern font with dynamic sizing and text shadows for readability.
- **Colors**: A professional palette using deep blues, greens, and reds.
- **Responsive Design**: Font sizes adjust based on bubble size for optimal readability.

## SVG and Canvas Styling

### SVG Manager

The `SVGManager` class is responsible for applying styles to the SVG elements dynamically. Key styles applied include:

- **Background**: Uses `--bubble-canvas-background` for a professional look.
- **Border Radius**: Applied for a modern, rounded corner effect.

### Bubble Text Styling

The CSS follows a terse, semantic approach with simplified class names:

#### Primary Text Class
- `.bubble`: Main class for all bubble text elements
  - Applies modern typography (Inter font family)
  - White text with shadows for readability
  - Anti-aliasing and optimized text rendering

#### Responsive Size Classes
- `.bubble-small`: Small text (10px, font-weight: 700)
- `.bubble-medium`: Medium text (12px, font-weight: 600) 
- `.bubble-large`: Large text (18px, font-weight: 500)

#### Layout-Specific Classes
- `.bubble-list`: List layout text positioning
  - Overrides default centering with left-alignment (`text-anchor: start`)
  - Ensures text appears to the right of circles in list view
  - Maintains vertical centering for clean alignment

#### Tooltip Styling
- `.bubble-chart-tooltip`: Interactive tooltip styling
  - Professional dark background with rounded corners
  - Uses Inter font family for consistency
  - Smooth opacity transitions
  - Positioned absolutely with proper z-index

## CSS-First Approach (D3 Recommended)

Following D3 community best practices, styling is primarily handled via CSS classes with minimal inline styles for dynamic behavior:

### Base Styling (CSS)
- Typography, colors, shadows, positioning → CSS variables and classes
- Static font properties → CSS
- Canvas background and layout → CSS

### Dynamic Behavior (Selective Inline)
- `font-size` → Calculated dynamically based on bubble radius
- Animation opacity → Controlled by D3 transitions

This hybrid approach promotes:

- **Separation of concerns**: Static styling in CSS, dynamic behavior in JavaScript
- **Better maintainability**: Centralized base styles with dynamic calculations
- **Performance**: CSS handles static rendering, JS handles data-driven sizing
- **Theming**: Easy customization via CSS variables with responsive behavior

## Debugging Tips

When styling issues arise, ensure:

- **Correct Class Application**: Verify the `.bubble` class is applied to text elements
- **Specificity Checks**: Ensure no inline styles override CSS rules (common in list builder)
- **CSS Variables**: Check that custom properties are properly defined in `:root`

## Additional Resources

For more information on D3's best practices for handling styles, please refer to the [D3 Documentation](https://d3js.org).
