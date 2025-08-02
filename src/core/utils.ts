/**
 * Consolidated Utilities for Bubble Chart Library
 * Merges D3 utilities, responsive text helpers, and other utility functions
 * 
 * Consolidates utilities from:
 * - src/d3/d3-data-utils.ts
 * - src/d3/d3-helpers.ts  
 * - src/utils/responsive-text.ts
 */

import * as d3 from 'd3';
import type { 
  ProcessedDataPoint
} from '../types.js';

// =============================================================================
// D3 DATA PROCESSING UTILITIES
// =============================================================================

/**
 * Create accessor function from string or function
 */
export function createAccessor<T>(accessor: string | ((d: T) => any)): (d: T) => any {
  return typeof accessor === 'function' ? accessor : (d: T) => (d as any)[accessor];
}

/**
 * Create radius scale for bubble sizing
 */
export function createRadiusScale(
  data: any[], 
  sizeAccessor: (d: any) => number, 
  range: [number, number] = [5, 50]
): d3.ScalePower<number, number> {
  const extent = d3.extent(data, sizeAccessor) as [number, number];
  
  return d3.scaleSqrt()
    .domain(extent)
    .range(range)
    .clamp(true);
}

/**
 * Themed color palettes with background support
 */
export const THEMED_PALETTES = {
  corporate: {
    colors: ['#1e40af', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c', '#0891b2', '#be185d'],
    background: '#1a1a2e',
    backgroundDark: '#16213e',
    waveBackground: '#16213e',
    liquidBackground: '#667eea',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  },
  ocean: {
    colors: ['#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'],
    background: '#0c4a6e',
    backgroundDark: '#075985',
    waveBackground: '#075985',
    liquidBackground: '#0284c7',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  },
  sunset: {
    colors: ['#dc2626', '#ea580c', '#f59e0b', '#eab308', '#facc15'],
    background: '#991b1b',
    backgroundDark: '#b91c1c',
    waveBackground: '#b91c1c',
    liquidBackground: '#dc2626',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  },
  forest: {
    colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
    background: '#14532d',
    backgroundDark: '#166534',
    waveBackground: '#166534',
    liquidBackground: '#15803d',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  },
  slate: {
    colors: ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'],
    background: '#7c2d12',
    backgroundDark: '#9a3412',
    waveBackground: '#9a3412',
    liquidBackground: '#c2410c',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  },
  wave: {
    colors: ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
    background: '#00f2fe',
    backgroundDark: '#4facfe',
    waveBackground: '#4facfe',
    liquidBackground: '#06b6d4',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    overlayOpacity: 0.85
  }
} as const;

/**
 * Basic color palettes
 */
export const COLOR_PALETTES = {
  vibrant: ['#E74C3C', '#F39C12', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63', '#FF5722', '#00BCD4'],
  sophisticated: ['#D63384', '#FD7E14', '#FFC107', '#198754', '#20C997', '#0D6EFD', '#6F42C1', '#D63384', '#DC3545', '#6C757D'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA', '#BAE1FF', '#E1BAFF', '#FFBADF', '#BFFFFF', '#FFE1BA', '#D4BAFF'],
  neon: ['#FF073A', '#FF8C00', '#FFD700', '#39FF14', '#00FFFF', '#1E90FF', '#DA70D6', '#FF1493', '#FF4500', '#7FFF00'],
  wave: ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F8B500', '#FF6B6B', '#4DABF7', '#69DB7C', '#FFD93D'],
  liquid: ['#FF4757', '#FF6348', '#FFA502', '#7ED321', '#50E3C2', '#4A90E2', '#BD10E0', '#F5A623', '#D0021B', '#417505']
} as const;

/**
 * Create color scale from values and palette
 */
export function createColorScale(
  colorValues: string[], 
  paletteType: keyof typeof COLOR_PALETTES = 'vibrant'
): d3.ScaleOrdinal<string, string> {
  const palette = COLOR_PALETTES[paletteType];
  return d3.scaleOrdinal<string, string>()
    .domain(colorValues)
    .range(palette);
}

/**
 * Create themed color palette with background support
 */
export function createThemedPalette(
  colorValues: string[],
  themeName: keyof typeof THEMED_PALETTES = 'corporate'
): {
  colorScale: d3.ScaleOrdinal<string, string>;
  theme: typeof THEMED_PALETTES[keyof typeof THEMED_PALETTES];
} {
  const theme = THEMED_PALETTES[themeName];
  const colorScale = d3.scaleOrdinal<string, string>()
    .domain(colorValues)
    .range(theme.colors);
  
  return { colorScale, theme };
}

/**
 * Get appropriate theme for chart type
 */
export function getThemeForChartType(
  chartType: string,
  explicitTheme?: string
): keyof typeof THEMED_PALETTES {
  if (explicitTheme && explicitTheme in THEMED_PALETTES) {
    return explicitTheme as keyof typeof THEMED_PALETTES;
  }
  
  // Default theme mappings
  const themeMap: Record<string, keyof typeof THEMED_PALETTES> = {
    wave: 'ocean',
    liquid: 'sunset',
    tree: 'forest',
    orbit: 'wave',
    motion: 'corporate',
    list: 'slate',
    bubble: 'corporate'
  };
  
  return themeMap[chartType] || 'corporate';
}

/**
 * Create font scale based on radius range
 */
export function createFontScale(
  radiusRange: [number, number],
  fontRange: [number, number] = [10, 20]
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear()
    .domain(radiusRange)
    .range(fontRange)
    .clamp(true);
}

/**
 * Process data for visualization with all required fields
 */
export function processForVisualization<T = any>(
  data: T[],
  labelAccessor: string | string[] | ((d: T) => string),
  sizeAccessor: string | string[] | ((d: T) => number),
  colorAccessor?: string | string[] | ((d: T) => string),
  timeAccessor?: string | string[] | ((d: T) => number),
  percentageAccessor?: boolean | ((d: T) => number)
): ProcessedDataPoint<T>[] {
  
  const getLabelValue = createAccessor(normalizeAccessor(labelAccessor, 'label'));
  const getSizeValue = createAccessor(normalizeAccessor(sizeAccessor, 'size'));
  const getColorValue = colorAccessor ? createAccessor(normalizeAccessor(colorAccessor, 'color')) : null;
  const getTimeValue = timeAccessor ? createAccessor(normalizeAccessor(timeAccessor, 'time')) : null;
  const getPercentageValue = (typeof percentageAccessor === 'function') ? percentageAccessor : null;
  
  return data.map(item => {
    const processed: ProcessedDataPoint<T> = {
      data: item,
      label: String(getLabelValue(item) || ''),
      size: Number(getSizeValue(item) || 0)
    };
    
    if (getColorValue) {
      processed.colorValue = String(getColorValue(item) || '');
    }
    
    if (getTimeValue) {
      processed.time = Number(getTimeValue(item) || 0);
    }
    
    if (getPercentageValue) {
      processed.percentage = Number(getPercentageValue(item) || 0);
    }
    
    return processed;
  });
}

/**
 * Sort processed data
 */
export function sortData<T = any>(
  data: ProcessedDataPoint<T>[],
  sortBy: 'size' | 'label' | 'time' = 'size',
  order: 'asc' | 'desc' = 'desc'
): ProcessedDataPoint<T>[] {
  const sorted = [...data].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortBy) {
      case 'size': aVal = a.size; bVal = b.size; break;
      case 'label': aVal = a.label; bVal = b.label; break;
      case 'time': aVal = a.time || 0; bVal = b.time || 0; break;
      default: aVal = a.size; bVal = b.size;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
}

/**
 * Get unique values from processed data
 */
export function getUniqueValues<T = any>(
  data: ProcessedDataPoint<T>[],
  property: keyof ProcessedDataPoint<T>
): any[] {
  const values = data.map(d => d[property]).filter(v => v !== undefined && v !== null);
  return Array.from(new Set(values));
}

/**
 * Create pack layout for bubble positioning
 */
export function createPackLayout<T = any>(
  data: ProcessedDataPoint<T>[],
  width: number,
  height: number,
  padding: number = 5
): Array<{ x: number; y: number; r: number; data: ProcessedDataPoint<T> }> {
  // Handle empty data
  if (!data || data.length === 0) {
    return [];
  }
  
  // Account for stroke width and padding to ensure bubbles stay within bounds
  const strokeWidth = 2; // Standard stroke width
  const margin = strokeWidth + 8; // Extra margin for safety (10px total)
  const adjustedWidth = Math.max(100, width - (margin * 2));
  const adjustedHeight = Math.max(100, height - (margin * 2));
  

  
  // Create hierarchy data structure compatible with D3
  const hierarchyData = {
    name: 'root',
    children: data.map(d => ({
      name: d.label || 'unknown',
      value: d.size || 1,
      data: d
    }))
  };
  
  // Create pack layout using adjusted dimensions
  const pack = d3.pack()
    .size([adjustedWidth, adjustedHeight])
    .padding(padding);
  
  // Generate hierarchy and apply layout
  const root = d3.hierarchy(hierarchyData)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));
  
  // Apply pack layout
  const packedRoot = pack(root as any);
  
  // Ensure we have a valid hierarchy with leaves method
  if (!packedRoot || typeof packedRoot.leaves !== 'function') {
    console.warn('Pack layout failed to create valid hierarchy');
    return [];
  }
  
  // Return positioned leaf nodes with margin offset to center in original space
  const layoutNodes = packedRoot.leaves().map(node => ({
    x: (node.x || 0) + margin, // Offset by margin to center in original space
    y: (node.y || 0) + margin, // Offset by margin to center in original space
    r: (node as any).r || 0,
    data: (node.data as any).data as ProcessedDataPoint<T>
  }));
  
  return layoutNodes;
}

/**
 * Calculate size statistics for data
 */
export function calculateSizeStats<T = any>(
  data: ProcessedDataPoint<T>[]
): {
  min: number;
  max: number;
  mean: number;
  median: number;
  extent: [number, number];
} {
  const sizes = data.map(d => d.size).sort((a, b) => a - b);
  const min = sizes[0] ?? 0;
  const max = sizes[sizes.length - 1] ?? 0;
  const mean = sizes.length > 0 ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length : 0;
  const median = sizes.length === 0 ? 0 :
    sizes.length % 2 === 0 
      ? ((sizes[sizes.length / 2 - 1] ?? 0) + (sizes[sizes.length / 2] ?? 0)) / 2
      : (sizes[Math.floor(sizes.length / 2)] ?? 0);
  
  return { min, max, mean, median, extent: [min, max] };
}

/**
 * Normalize accessor to string or function
 */
function normalizeAccessor(
  accessor: string | string[] | ((d: any) => any) | undefined,
  fallback: string
): string | ((d: any) => any) {
  if (typeof accessor === 'function') {
    return accessor;
  }
  
  if (Array.isArray(accessor)) {
    return accessor.length > 0 ? (accessor[0] ?? fallback) : fallback;
  }
  
  return (accessor ?? fallback) as string;
}

/**
 * Format label text with optional truncation
 */
export function formatLabel(label: string, maxLength?: number): string {
  if (!maxLength || label.length <= maxLength) {
    return label;
  }
  return label.substring(0, maxLength - 3) + '...';
}

/**
 * Format numbers using D3 formatting
 */
export function formatNumber(value: number, format: string = '.2s'): string {
  return d3.format(format)(value);
}

/**
 * Format dates using D3 formatting
 */
export function formatDate(date: Date, format: string = '%Y-%m-%d'): string {
  return d3.timeFormat(format)(date);
}

// =============================================================================
// RESPONSIVE TEXT UTILITIES
// =============================================================================

/**
 * Responsive text configuration options
 */
export interface ResponsiveTextOptions {
  minSize?: number;
  maxSize?: number;
  baseWidth?: number;
  unit?: 'rem' | 'px' | 'em';
  scalingFactor?: number;
}

/**
 * Responsive breakpoints
 */
export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

/**
 * Calculate responsive font size based on viewport width
 */
export function calculateResponsiveFontSize(viewportWidth: number, options: ResponsiveTextOptions = {}): number {
  const {
    minSize = 12,
    maxSize = 24,
    baseWidth = 1200,
    scalingFactor = 0.8
  } = options;
  
  // Calculate proportional size
  const proportionalSize = (viewportWidth / baseWidth) * maxSize * scalingFactor;
  
  // Clamp between min and max
  return Math.max(minSize, Math.min(maxSize, proportionalSize));
}

/**
 * Get current responsive breakpoint
 */
export function getCurrentBreakpoint(viewportWidth: number): keyof ResponsiveBreakpoints {
  const breakpoints: ResponsiveBreakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    large: Infinity
  };
  
  if (viewportWidth < breakpoints.mobile) return 'mobile';
  if (viewportWidth < breakpoints.tablet) return 'tablet';
  if (viewportWidth < breakpoints.desktop) return 'desktop';
  return 'large';
}

/**
 * Apply responsive font sizing to D3 selection
 */
export function applyResponsiveFontSize(
  selection: d3.Selection<any, any, any, any>,
  viewportWidth: number,
  options: ResponsiveTextOptions = {}
): void {
  const fontSize = calculateResponsiveFontSize(viewportWidth, options);
  const unit = options.unit || 'px';
  
  selection.style('font-size', `${fontSize}${unit}`);
}

/**
 * Wrap text in SVG elements
 */
export function wrapText(
  textSelection: d3.Selection<SVGTextElement, any, any, any>,
  width: number
): void {
  textSelection.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: string | undefined;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy') || '0');
    
    let tspan = text.text(null)
      .append('tspan')
      .attr('x', text.attr('x'))
      .attr('y', y)
      .attr('dy', dy + 'em');
    
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(' '));
      
      // Check if line is too long
      if (tspan.node()?.getComputedTextLength() || 0 > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        
        tspan = text.append('tspan')
          .attr('x', text.attr('x'))
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    }
  });
}

/**
 * Truncate text to fit within specified width
 */
export function truncateText(
  text: string,
  maxWidth: number,
  fontSize: number = 12,
  fontFamily: string = 'sans-serif'
): string {
  // Create temporary text element to measure width
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return text;
  
  context.font = `${fontSize}px ${fontFamily}`;
  
  // If text fits, return as-is
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }
  
  // Truncate with ellipsis
  let truncated = text;
  while (context.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  
  return truncated + '...';
} 