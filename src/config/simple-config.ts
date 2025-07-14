/**
 * Simplified Configuration System - Phase 2.2
 * Consolidates 43 properties into essential core and optional specialized configs
 */

import * as d3 from 'd3';
import type { BubbleChartData } from '../types/index.js';

/**
 * Chart type options available in the library
 */
export type ChartType = 
  | 'none' 
  | 'wave' 
  | 'liquid' 
  | 'tree' 
  | 'motion' 
  | 'orbit' 
  | 'list';

/**
 * Essential configuration - covers 90% of use cases
 */
export interface CoreChartOptions<T extends BubbleChartData = BubbleChartData> {
  // Required core properties
  container: string;
  label: string | string[] | ((d: T) => string);
  size: string | string[] | ((d: T) => number);
  
  // Common optional properties
  type?: ChartType;
  color?: d3.ScaleOrdinal<string, string> | ((data: T, index?: number) => string) | string;
  theme?: 'corporate' | 'ocean' | 'sunset' | 'forest' | 'slate' | 'wave';
  width?: number;
  height?: number;
  
  // Data processing
  keyFunction?: ((d: T) => string | number);
  percentage?: ((d: T) => number);
}

/**
 * Animation configuration
 */
export interface AnimationOptions {
  enter?: {
    duration: number;
    stagger?: number;
    easing?: string;
    delay?: number;
  };
  update?: {
    duration: number;
    easing?: string;
    delay?: number;
  };
  exit?: {
    duration: number;
    easing?: string;
    delay?: number;
  };
}

/**
 * Chart-specific configurations for advanced use cases
 */
export interface SpecializedOptions<T extends BubbleChartData = BubbleChartData> {
  // Animation
  animation?: AnimationOptions;
  
  // Physics simulation (motion, orbit charts)
  cluster?: boolean;
  friction?: number;
  
  // Wave-specific
  waveSpeed?: number;
  waveAmplitude?: number;
  
  // Tree-specific
  treeSpeed?: number;
  treeMinRadius?: number;
  
  // List-specific  
  listMinRadius?: number;
  listMaxRadius?: number;
  listPadding?: number;
  
  // Event handling
  onClick?: (data: T, event?: MouseEvent) => void;
  onMouseOver?: (data: T, event?: MouseEvent) => void;
  onMouseOut?: (data: T, event?: MouseEvent) => void;
  
  // Advanced styling
  padding?: number;
  offset?: number;
  sort?: boolean;
  defaultColor?: string;
}

/**
 * Unified simplified configuration interface
 */
export interface SimplifiedChartOptions<T extends BubbleChartData = BubbleChartData> 
  extends CoreChartOptions<T>, SpecializedOptions<T> {}

/**
 * Default configuration factory
 */
export function createDefaultOptions<T extends BubbleChartData = BubbleChartData>(): SimplifiedChartOptions<T> {
  return {
    container: '',
    label: 'name',
    size: 'value',
    type: 'none',
    width: 500,
    height: 500,
    theme: 'corporate',
    defaultColor: '#ddd',
    padding: 30,
    offset: 5,
    sort: false,
    animation: {
      enter: { duration: 800, stagger: 50, easing: 'ease-out', delay: 0 },
      update: { duration: 640, easing: 'ease-in-out', delay: 0 },
      exit: { duration: 400, easing: 'ease-in', delay: 0 }
    },
    cluster: true,
    friction: 0.85,
    waveSpeed: 150,
    waveAmplitude: 11,
    treeSpeed: 150,
    treeMinRadius: 10,
    listMinRadius: 2,
    listMaxRadius: 25,
    listPadding: 5
  };
}

/**
 * Configuration validation
 */
export function validateConfig<T extends BubbleChartData = BubbleChartData>(
  config: Partial<SimplifiedChartOptions<T>>
): string[] {
  const errors: string[] = [];
  
  if (!config.container) errors.push('container is required');
  if (!config.label) errors.push('label is required');
  if (!config.size) errors.push('size is required');
  
  if (config.type && !['none', 'wave', 'liquid', 'tree', 'motion', 'orbit', 'list'].includes(config.type)) {
    errors.push(`Invalid chart type: ${config.type}`);
  }
  
  return errors;
}

/**
 * Migration helper - converts simplified config to old format for backward compatibility
 */
export function migrateConfig(newConfig: SimplifiedChartOptions): any {
  const oldConfig: any = {
    container: newConfig.container,
    label: newConfig.label,
    size: newConfig.size,
    type: newConfig.type || 'none',
    color: newConfig.color,
    theme: newConfig.theme,
    width: newConfig.width,
    height: newConfig.height,
    keyFunction: newConfig.keyFunction,
    percentage: newConfig.percentage,
    animation: newConfig.animation,
    cluster: newConfig.cluster,
    friction: newConfig.friction,
    padding: newConfig.padding,
    offset: newConfig.offset,
    sort: newConfig.sort,
    defaultColor: newConfig.defaultColor
  };
  
  // Map new simplified format to old wave config
  if (newConfig.waveSpeed || newConfig.waveAmplitude) {
    oldConfig.wave = {
      speed: newConfig.waveSpeed || 150,
      dy: newConfig.waveAmplitude || 11,
      count: 4 // default value
    };
  }
  
  // Map new simplified format to old tree config
  if (newConfig.treeSpeed || newConfig.treeMinRadius) {
    oldConfig.tree = {
      speed: newConfig.treeSpeed || 150,
      minRadius: newConfig.treeMinRadius || 10
    };
  }
  
  // Map new simplified format to old list config
  if (newConfig.listMinRadius || newConfig.listMaxRadius || newConfig.listPadding) {
    oldConfig.listBubble = {
      minRadius: newConfig.listMinRadius || 2,
      maxRadius: newConfig.listMaxRadius || 25,
      padding: newConfig.listPadding || 5,
      textWidth: 200 // default value
    };
  }
  
  return oldConfig;
}
