/**
 * Coordinate System Module
 * Handles conversions between normalized (0-1) and absolute pixel coordinates
 * Prevents confusion about coordinate spaces that led to the double-multiplication bug
 */

/**
 * Normalized coordinates (0-1 range)
 */
export interface NormalizedPosition {
  x: number; // 0-1
  y: number; // 0-1
  _normalized: true; // Type brand to prevent mixing coordinate systems
}

/**
 * Absolute pixel coordinates
 */
export interface AbsolutePosition {
  x: number; // pixels
  y: number; // pixels
  _absolute: true; // Type brand to prevent mixing coordinate systems
}

/**
 * Canvas dimensions
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Coordinate system converter class
 * Ensures type safety when converting between coordinate systems
 */
export class CoordinateSystem {
  /**
   * Create a normalized position (0-1 range)
   * Validates that values are in correct range
   */
  static normalized(x: number, y: number): NormalizedPosition {
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      console.warn(`Normalized coordinates should be 0-1, got (${x}, ${y})`);
    }
    return { x, y, _normalized: true };
  }

  /**
   * Create an absolute position (pixel values)
   */
  static absolute(x: number, y: number): AbsolutePosition {
    return { x, y, _absolute: true };
  }

  /**
   * Convert normalized coordinates to absolute pixels
   */
  static toAbsolute(
    normalized: NormalizedPosition, 
    dimensions: CanvasDimensions
  ): AbsolutePosition {
    return {
      x: normalized.x * dimensions.width,
      y: normalized.y * dimensions.height,
      _absolute: true
    };
  }

  /**
   * Convert absolute coordinates to normalized (0-1)
   */
  static toNormalized(
    absolute: AbsolutePosition,
    dimensions: CanvasDimensions
  ): NormalizedPosition {
    return {
      x: absolute.x / dimensions.width,
      y: absolute.y / dimensions.height,
      _normalized: true
    };
  }

  /**
   * Constrain absolute position within canvas bounds with padding
   */
  static constrainToCanvas(
    position: AbsolutePosition,
    dimensions: CanvasDimensions,
    padding: number = 0
  ): AbsolutePosition {
    return {
      x: Math.max(padding, Math.min(dimensions.width - padding, position.x)),
      y: Math.max(padding, Math.min(dimensions.height - padding, position.y)),
      _absolute: true
    };
  }

  /**
   * Check if absolute position is within canvas bounds
   */
  static isWithinCanvas(
    position: AbsolutePosition,
    dimensions: CanvasDimensions,
    padding: number = 0
  ): boolean {
    return position.x >= padding && 
           position.x <= dimensions.width - padding &&
           position.y >= padding && 
           position.y <= dimensions.height - padding;
  }

  /**
   * Calculate distance between two absolute positions
   */
  static distance(a: AbsolutePosition, b: AbsolutePosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Type guard to check if position is normalized
   */
  static isNormalized(pos: any): pos is NormalizedPosition {
    return pos && pos._normalized === true;
  }

  /**
   * Type guard to check if position is absolute
   */
  static isAbsolute(pos: any): pos is AbsolutePosition {
    return pos && pos._absolute === true;
  }
}

/**
 * Category position manager - handles positions for different analysis types
 */
export class CategoryPositionManager {
  private normalizedPositions = new Map<string, NormalizedPosition>();
  private absolutePositions = new Map<string, AbsolutePosition>();
  private lastDimensions: CanvasDimensions | null = null;

  /**
   * Set normalized position for a category
   */
  setNormalizedPosition(category: string, x: number, y: number): void {
    this.normalizedPositions.set(category, CoordinateSystem.normalized(x, y));
    
    // If we have dimensions, update absolute positions too
    if (this.lastDimensions) {
      this.updateAbsolutePositions(this.lastDimensions);
    }
  }

  /**
   * Update all absolute positions when canvas size changes
   */
  updateAbsolutePositions(dimensions: CanvasDimensions): void {
    this.lastDimensions = dimensions;
    
    this.normalizedPositions.forEach((normalizedPos, category) => {
      const absolutePos = CoordinateSystem.toAbsolute(normalizedPos, dimensions);
      this.absolutePositions.set(category, absolutePos);
    });
  }

  /**
   * Get absolute position for a category
   * Returns center of canvas if category not found
   */
  getAbsolutePosition(category: string, dimensions: CanvasDimensions): AbsolutePosition {
    // Update positions if dimensions changed
    if (!this.lastDimensions || 
        this.lastDimensions.width !== dimensions.width || 
        this.lastDimensions.height !== dimensions.height) {
      this.updateAbsolutePositions(dimensions);
    }

    const position = this.absolutePositions.get(category);
    if (position) {
      return position;
    }

    // Default to center if not found
    return CoordinateSystem.absolute(dimensions.width / 2, dimensions.height / 2);
  }

  /**
   * Get normalized position for a category
   */
  getNormalizedPosition(category: string): NormalizedPosition | undefined {
    return this.normalizedPositions.get(category);
  }

  /**
   * Clear all positions
   */
  clear(): void {
    this.normalizedPositions.clear();
    this.absolutePositions.clear();
    this.lastDimensions = null;
  }
}
