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
    console.log('BuilderFactory: Creating builder for type:', config.type);
    
    switch (config.type) {
      case 'orbit':
        console.log('BuilderFactory: Created OrbitBuilder');
        return new OrbitBuilder<T>(config);
        
      case 'tree':
        console.log('BuilderFactory: Created TreeBuilder');
        return new TreeBuilder<T>(config);
        
      case 'motion':
        console.log('BuilderFactory: Created MotionBubble');
        return new MotionBubble<T>(config);
        
      case 'list':
        console.log('BuilderFactory: Created ListBuilder');
        return new ListBuilder<T>(config);
        
      case 'wave':
        console.log('BuilderFactory: Created WaveBubble');
        return new WaveBubble<T>(config);
        
      case 'liquid':
        console.log('BuilderFactory: Created LiquidBubble');
        return new LiquidBubble<T>(config);
        
      default:
        console.log('BuilderFactory: Created default BubbleBuilder for type:', config.type);
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
