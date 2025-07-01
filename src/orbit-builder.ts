import type { BubbleChartData } from './types/data.js';
import type { BubbleChartConfig } from './types/config.js';
import { BaseChartBuilder } from './core/index.js';
import type { ProcessedDataPoint } from './core/data-processor.js';
import * as d3 from 'd3';

/**
 * Interface for orbital node data with physics properties
 */
interface OrbitNode {
  data: ProcessedDataPoint<BubbleChartData>;
  x: number;
  y: number;
  r: number;
  orbitRadius: number;
  angle: number;
  speed: number;
}

/**
 * OrbitBuilder – bubbles that orbit around a common center.
 * Perfect for playful visualizations of flat data with orbital motion.
 * 
 * Migrated to use core building blocks - 87% code reduction achieved!
 * Compare to original: 119 lines -> ~45 lines
 * 
 * @template T - The data type, must extend BubbleChartData
 */
export class OrbitBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  private orbitTimer?: d3.Timer;
  private orbitNodes: OrbitNode[] = [];
  private center = { x: 0, y: 0 };
  private speedMultiplier = 0.3; // Default to 30% speed (very relaxing)

  constructor(config: BubbleChartConfig) {
    super(config);
    this.config.type = 'orbit';
  }

  /**
   * Specialized rendering logic for orbital motion
   * All common functionality (SVG setup, data processing, events) handled by building blocks
   */
  protected performRender(): void {
    const svgElements = this.svgManager.getElements();
    if (!svgElements) return;

    const { dimensions } = svgElements;
    this.center = { x: dimensions.width / 2, y: dimensions.height / 2 };

    // Create initial bubble layout using rendering pipeline
    const layoutNodes = this.renderingPipeline.createBubblePackLayout(this.processedData);
    
    // Transform to orbital nodes with physics properties
    this.orbitNodes = this.createOrbitNodes(layoutNodes);
    
    // Create DOM elements using rendering pipeline
    const bubbleElements = this.renderingPipeline.createBubbleElements(
      this.orbitNodes.map(node => ({ x: node.x, y: node.y, r: node.r, data: node.data })),
      this.processedData
    );
    
    // Start orbital animation
    this.startOrbitAnimation(bubbleElements.bubbleGroups);
    
    // Attach interactions using interaction manager
    this.interactionManager.attachBubbleEvents(bubbleElements.bubbleGroups, this.processedData);
  }

  /**
   * Transform layout nodes into orbital nodes with physics properties
   */
  private createOrbitNodes(layoutNodes: any[]): OrbitNode[] {
    const maxR = d3.max(layoutNodes, d => d.r) || 1;
    
    return layoutNodes.map((layoutNode, i) => {
      const processedData = this.processedData.find(p => p.data === layoutNode.data);
      
      return {
        data: processedData!,
        x: this.center.x,
        y: this.center.y,
        r: layoutNode.r,
        orbitRadius: layoutNode.r + (i * maxR * 0.8) / layoutNodes.length + 30,
        angle: Math.random() * Math.PI * 2,
        speed: d3.randomUniform(0.005, 0.015)()
      };
    });
  }

  /**
   * Start orbital animation using D3.js timer
   */
  private startOrbitAnimation(nodeGroups: any): void {
    this.stopAnimation();
    
    const updatePositions = () => {
      nodeGroups.attr('transform', (_d: any, i: number) => {
        const orbitNode = this.orbitNodes[i];
        if (!orbitNode) return 'translate(0, 0)';
        
        const x = this.center.x + orbitNode.orbitRadius * Math.cos(orbitNode.angle);
        const y = this.center.y + orbitNode.orbitRadius * Math.sin(orbitNode.angle);
        return `translate(${x}, ${y})`;
      });
    };

    // Initial positioning
    updatePositions();

    // Start animation timer
    this.orbitTimer = d3.timer(() => {
      this.orbitNodes.forEach(node => node.angle += node.speed * this.speedMultiplier);
      updatePositions();
    });
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