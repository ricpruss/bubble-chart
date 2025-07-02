/**
 * Animation Presets Module
 * Predefined animation configurations for different use cases
 */

export interface AnimationConfig {
  enter?: {
    duration: number;
    stagger?: number;
    easing?: string;
    delay?: number;
  } | undefined;
  update?: {
    duration: number;
    easing?: string;
    delay?: number;
  } | undefined;
  exit?: {
    duration: number;
    easing?: string;
    delay?: number;
  } | undefined;
}

export type AnimationPresetName = 'gentle' | 'energetic' | 'minimal' | 'smooth' | 'bouncy' | 'fade' | 'none';

/**
 * Animation presets for different use cases
 */
export class AnimationPresets {
  private static presets: Record<AnimationPresetName, AnimationConfig> = {
    gentle: {
      enter: { duration: 1200, stagger: 80, easing: 'ease-out', delay: 0 },
      update: { duration: 800, easing: 'ease-in-out', delay: 0 },
      exit: { duration: 600, easing: 'ease-in', delay: 0 }
    },
    
    energetic: {
      enter: { duration: 400, stagger: 30, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', delay: 0 },
      update: { duration: 300, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', delay: 0 },
      exit: { duration: 250, easing: 'ease-out', delay: 0 }
    },
    
    minimal: {
      enter: { duration: 5, stagger: 0, easing: 'linear', delay: 0 },
      update: { duration: 1, easing: 'linear', delay: 0 },
      exit: { duration: 1, easing: 'linear', delay: 0 }
    },
    
    smooth: {
      enter: { duration: 800, stagger: 50, easing: 'ease-out', delay: 0 },
      update: { duration: 600, easing: 'ease-in-out', delay: 0 },
      exit: { duration: 400, easing: 'ease-in', delay: 0 }
    },
    
    bouncy: {
      enter: { duration: 1000, stagger: 60, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', delay: 0 },
      update: { duration: 700, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', delay: 0 },
      exit: { duration: 500, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', delay: 0 }
    },
    
    fade: {
      enter: { duration: 600, stagger: 40, easing: 'ease-out', delay: 0 },
      update: { duration: 400, easing: 'ease-in-out', delay: 0 },
      exit: { duration: 300, easing: 'ease-in', delay: 0 }
    },
    
    none: {
      enter: { duration: 0, stagger: 0, easing: 'linear', delay: 0 },
      update: { duration: 0, easing: 'linear', delay: 0 },
      exit: { duration: 0, easing: 'linear', delay: 0 }
    }
  };

  /**
   * Get a predefined animation preset
   */
  static get(preset: AnimationPresetName): AnimationConfig {
    return this.presets[preset];
  }

  /**
   * Get all available preset names
   */
  static getAvailablePresets(): AnimationPresetName[] {
    return Object.keys(this.presets) as AnimationPresetName[];
  }

  /**
   * Create a custom animation configuration
   */
  static custom(config: Partial<AnimationConfig>): AnimationConfig {
    const defaultConfig = this.presets.smooth;
    return {
      enter: defaultConfig.enter ? { ...defaultConfig.enter, ...config.enter } : config.enter,
      update: defaultConfig.update ? { ...defaultConfig.update, ...config.update } : config.update,
      exit: defaultConfig.exit ? { ...defaultConfig.exit, ...config.exit } : config.exit
    };
  }

  /**
   * Validate an animation configuration
   */
  static isValid(config: AnimationConfig): boolean {
    const validatePhase = (phase: any) => {
      if (!phase) return true;
      return typeof phase.duration === 'number' && 
             phase.duration >= 0 &&
             (!phase.stagger || typeof phase.stagger === 'number') &&
             (!phase.delay || typeof phase.delay === 'number');
    };

    return validatePhase(config.enter) && 
           validatePhase(config.update) && 
           validatePhase(config.exit);
  }

  /**
   * Scale animation durations by a factor
   */
  static scale(config: AnimationConfig, factor: number): AnimationConfig {
    const scalePhase = (phase: any) => {
      if (!phase) return phase;
      return {
        ...phase,
        duration: Math.round(phase.duration * factor),
        stagger: phase.stagger ? Math.round(phase.stagger * factor) : phase.stagger,
        delay: phase.delay ? Math.round(phase.delay * factor) : phase.delay
      };
    };

    return {
      enter: scalePhase(config.enter),
      update: scalePhase(config.update),
      exit: scalePhase(config.exit)
    };
  }

  /**
   * Get animation configuration optimized for data size
   */
  static forDataSize(itemCount: number): AnimationConfig {
    if (itemCount <= 50) {
      return this.get('gentle');
    } else if (itemCount <= 200) {
      return this.get('smooth');
    } else if (itemCount <= 500) {
      return this.get('minimal');
    } else {
      return this.get('none');
    }
  }

  /**
   * Get configuration for specific use cases
   */
  static forUseCase(useCase: 'dashboard' | 'presentation' | 'realtime' | 'exploratory'): AnimationConfig {
    switch (useCase) {
      case 'dashboard':
        return this.get('minimal');
      case 'presentation':
        return this.get('gentle');
      case 'realtime':
        return this.get('energetic');
      case 'exploratory':
        return this.get('smooth');
      default:
        return this.get('smooth');
    }
  }
} 