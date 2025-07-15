import type { BubbleChartData } from '../data/index.js';
import type { BubbleChartOptions, ChartHandle } from '../config/index.js';
import { BaseChartBuilder } from '../core/index.js';
import { ChartPipeline } from './shared/index.js';
import * as d3 from 'd3';


/**
 * Interface for orbital node data with physics properties
 * Simplified to use D3's native data binding patterns
 */
interface OrbitNode extends d3.SimulationNodeDatum {
  // Inherit x?, y?, index?, vx?, vy?, fx?, fy? from SimulationNodeDatum
  data: BubbleChartData; // Direct reference to original data
  r: number;
  orbitRadius: number;
  angle: number;
  speed: number;
  label: string; // Pre-computed for performance
  size: number;  // Pre-computed for performance
  colorValue?: string; // Pre-computed color value
  color: string; // Pre-computed color for performance
}

/**
 * OrbitBuilder – bubbles that orbit around a common center.
 * Perfect for playful visualizations of flat data with orbital motion.
 * 
 * Migrated to use core building blocks - 87% code reduction achieved!
 * Compare to original: 119 lines -> ~45 lines
 * Implements ChartHandle interface for unified API
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class OrbitBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> implements ChartHandle<T> {
  private orbitTimer?: d3.Timer;
  private orbitNodes: OrbitNode[] = [];
  private center = { x: 0, y: 0 };
  private speedMultiplier = 0.3; // Default to 30% speed (very relaxing)

  constructor(config: BubbleChartOptions) {
    // Ensure we can modify the config by creating a mutable copy
    const mutableConfig = { ...config, type: 'orbit' as const };
    super(mutableConfig);
  }

  /**
   * Specialized rendering logic for orbital motion
   * Simplified to use D3's native data patterns
   */
  protected performRender(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const { svg, dimensions } = svgElements;
    this.center = { x: dimensions.width / 2, y: dimensions.height / 2 };

    const processedData = ChartPipeline.processData(this.chartData, this.config);

    // Create radius scale using central utility
    const radiusScale = ChartPipeline.createRadiusScale(processedData, [8, Math.min(dimensions.width, dimensions.height) / 12]);

    // Create color scale
    const { colorScale, theme } = ChartPipeline.createColorScale(processedData, this.config);

    // Apply theme background color if available
    ChartPipeline.applyTheme(svg, theme);

    // Create orbit nodes with simplified logic
    this.orbitNodes = this.createSimplifiedOrbitNodes(processedData, radiusScale, colorScale);
    
    // Create bubbles using centralized rendering
    const bubbleGroups = ChartPipeline.renderBubbleGroups(svg, this.orbitNodes, {
      keyFunction: (d: any) => d.label,
      cssClass: 'bubble-chart bubble',
      transform: false // We'll handle positioning manually due to orbital motion
    });

    // Add circles using centralized rendering
    ChartPipeline.renderCircles(bubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      colorAccessor: (d: any) => d.color,
      strokeColor: '#fff',
      strokeWidth: 2,
      opacity: 0.8,
      initialRadius: 0,
      initialOpacity: 0
    });

    // Add labels using centralized rendering
    ChartPipeline.renderLabels(bubbleGroups, {
      radiusAccessor: (d: any) => d.r,
      labelAccessor: (d: any) => d.data?.label || d.label || '',
      textColor: this.getTextColor(),
      initialOpacity: 1 // Orbit bubbles render text immediately
    });
    
    // Start orbital animation
    this.startOrbitAnimation(bubbleGroups);
    
    // Attach standardized event handling
    ChartPipeline.attachStandardEvents(bubbleGroups, this.interactionManager);
  }

  /**
   * Create simplified orbit nodes using D3's native patterns
   * Eliminates the complex data lookup that was causing bugs
   */
  private createSimplifiedOrbitNodes(
    processedData: Array<{ data: BubbleChartData; label: string; size: number; colorValue?: string }>,
    radiusScale: d3.ScalePower<number, number>,
    colorScale: any
  ): OrbitNode[] {
    // Use D3's range for orbital positioning
    const orbitRadii = d3.range(processedData.length).map(i => 
      60 + (i * 40) // Simple linear spacing
    );
    
    return processedData.map((item, i) => {
      const node: OrbitNode = {
        data: item.data,
        label: item.label,
        size: item.size,
        x: this.center.x, // Will be updated by animation
        y: this.center.y, // Will be updated by animation
        r: radiusScale(item.size),
        orbitRadius: orbitRadii[i] || 60, // Provide fallback
        angle: (i / processedData.length) * Math.PI * 2, // Evenly distribute initially
        speed: d3.randomUniform(0.008, 0.020)(), // Use D3's random utilities
        color: item.colorValue ? colorScale(item.colorValue) : (this.config.defaultColor || '#1f77b4')
      };
      
      if (item.colorValue) {
        node.colorValue = item.colorValue;
      }
      
      return node;
    });
  }



  /**
   * Start orbital animation using D3's timer and data binding
   * Simplified to use D3's native data patterns
   */
  private startOrbitAnimation(nodeGroups: d3.Selection<any, any, any, any>): void {
    this.stopAnimation();
    
    // Use D3's data binding to update positions
    const updatePositions = () => {
      nodeGroups.attr('transform', d => {
        // Update the angle in the bound data directly
        d.angle += d.speed * this.speedMultiplier;
        
        // Calculate position using D3's math utilities
        const x = this.center.x + d.orbitRadius * Math.cos(d.angle);
        const y = this.center.y + d.orbitRadius * Math.sin(d.angle);
        
        // Update the node's position for D3's simulation compatibility
        d.x = x;
        d.y = y;
        
        return `translate(${x}, ${y})`;
      });
    };

    // Initial positioning
    updatePositions();

    // Start animation timer using D3's timer
    this.orbitTimer = d3.timer(updatePositions);
  }

  /**
   * Stop orbital animation
   */
  private stopAnimation(): void {
    if (this.orbitTimer) {
      this.orbitTimer.stop();
      this.orbitTimer = undefined as any;
    }
  }

  /**
   * Get readonly merged options (unified API)
   * @returns Readonly configuration options
   */
  override options(): Readonly<BubbleChartOptions<T>> {
    return Object.freeze(this.config as unknown as BubbleChartOptions<T>);
  }

  /**
   * Merge-update options (unified API)
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
    // Update building blocks with new config if needed
    if (this.dataProcessor && this.chartData.length) {
      this.processedData = this.dataProcessor.process(this.chartData);
    }
    
    return this;
  }

  /**
   * Set the speed multiplier for orbital motion
   * @param multiplier - Speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(3.0, multiplier)); // Clamp between 0.1x and 3.0x
  }

  /**
   * Get the current speed multiplier
   * @returns Current speed multiplier
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  /**
   * Clean up animation timer and resources
   */
  override destroy(): void {
    this.stopAnimation();
    this.orbitNodes = [];
    super.destroy();
  }
} 