import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions } from '../types/config.js';
import { BubbleBuilder } from '../bubble-builder.js';
import { TreeBuilder } from '../tree-builder.js';
import { OrbitBuilder } from '../orbit-builder.js';
import { MotionBubble } from '../motion-bubble.js';
import { ListBuilder } from '../list-builder.js';
import { WaveBubble } from '../wave-bubble.js';
import { LiquidBubble } from '../liquid-bubble.js';

/**
 * Factory for creating appropriate builder instances based on chart configuration
 * Extracted from reactive/chart.ts to improve maintainability and testing
 */
export class BuilderFactory {
  /**
   * Create the appropriate builder based on chart type
   * @param config - Chart configuration including type
   * @returns Configured builder instance
   */
  static create<T extends BubbleChartData = BubbleChartData>(
    config: BubbleChartOptions
  ): BubbleBuilder<T> | TreeBuilder<T> | OrbitBuilder<T> | MotionBubble<T> | ListBuilder<T> | WaveBubble<T> | LiquidBubble<T> {
    switch (config.type) {
      case 'orbit':
        return new OrbitBuilder<T>(config);
        
      case 'tree':
        return new TreeBuilder<T>(config);
        
      case 'motion':
        return new MotionBubble<T>(config);
        
      case 'list':
        return new ListBuilder<T>(config);
        
      case 'wave':
        return new WaveBubble<T>(config);
        
      case 'liquid':
        return new LiquidBubble<T>(config);
        
      default:
        return new BubbleBuilder<T>(config);
    }
  }

  /**
   * Get list of supported chart types
   * @returns Array of supported chart type strings
   */
  static getSupportedTypes(): string[] {
    return ['bubble', 'tree', 'orbit', 'motion', 'list', 'wave', 'liquid'];
  }

  /**
   * Validate that a chart type is supported
   * @param type - Chart type to validate
   * @returns True if supported, false otherwise
   */
  static isValidType(type: string): boolean {
    return this.getSupportedTypes().includes(type);
  }

  /**
   * Get the default chart type
   * @returns Default chart type string
   */
  static getDefaultType(): string {
    return 'bubble';
  }
}
