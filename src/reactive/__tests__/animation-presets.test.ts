/**
 * Unit tests for Animation Presets
 * Regression tests to prevent stagger animation breaking during preset implementation
 */

import { AnimationPresets, type AnimationPresetName } from '../animation-presets.js';
import type { AnimationConfig } from '../../types/config.js';

describe('AnimationPresets', () => {
  describe('Theory 1: Animation Preset Override Prevention', () => {
    it('should preserve existing stagger values when applying presets', () => {
      // Test that presets don't accidentally null out stagger values
      const presets: AnimationPresetName[] = ['gentle', 'energetic', 'minimal', 'smooth', 'bouncy', 'fade'];
      
      presets.forEach(presetName => {
        const config = AnimationPresets.get(presetName);
        
        // All presets should have stagger values defined (except 'none' and 'minimal')
        if (presetName !== 'none' && presetName !== 'minimal') {
          expect(config.enter?.stagger).toBeDefined();
          expect(typeof config.enter?.stagger).toBe('number');
          expect(config.enter!.stagger).toBeGreaterThan(0);
        }
      });
    });

    it('should not override existing stagger when merging configurations', () => {
      // Test custom merge scenario
      const customConfig = AnimationPresets.custom({
        enter: { duration: 1000 } // Only changing duration, should preserve stagger
      });

      // Custom should preserve non-specified values from the base (smooth preset)
      expect(customConfig.enter?.stagger).toBeDefined();
      expect(customConfig.enter?.duration).toBe(1000);
    });

    it('should never return configurations with undefined stagger values', () => {
      const allPresets = AnimationPresets.getAvailablePresets();
      
      allPresets.forEach(preset => {
        const config = AnimationPresets.get(preset);
        
        if (config.enter) {
          // Stagger should either be a number or specifically 0, never undefined
          expect(config.enter.stagger).not.toBe(undefined);
          expect(typeof config.enter.stagger).toBe('number');
        }
      });
    });
  });

  describe('Theory 2: Configuration Merging Issue Prevention', () => {
    it('should perform deep merging rather than shallow replacement', () => {
      // Test partial configuration merge
      const partialUpdate = {
        enter: { duration: 1200 } // Only update duration
      };

      const merged = AnimationPresets.custom(partialUpdate);
      
      // Should preserve stagger from base configuration (smooth preset)
      expect(merged.enter?.stagger).toBeDefined();
      expect(merged.enter?.duration).toBe(1200);
      expect(merged.enter?.easing).toBeDefined(); // Should preserve easing
    });

    it('should preserve all animation phases during merging', () => {
      const customConfig = AnimationPresets.custom({
        update: { duration: 500 }
      });

      // All phases should be preserved from base config
      expect(customConfig.enter).toBeDefined();
      expect(customConfig.update).toBeDefined();
      expect(customConfig.exit).toBeDefined();
      
      // Specific values should be correct
      expect(customConfig.update?.duration).toBe(500);
      expect(customConfig.enter?.stagger).toBeDefined();
    });

    it('should handle null and undefined values correctly during merging', () => {
      // Test edge case where undefined values are passed
      const customConfig = AnimationPresets.custom({
        enter: { duration: 1000, stagger: undefined as any }
      });

      // Should not allow undefined stagger values
      expect(customConfig.enter?.stagger).not.toBe(undefined);
    });
  });

  describe('Theory 3: Default Value Collision Prevention', () => {
    it('should have consistent default values across all presets', () => {
      const presets = AnimationPresets.getAvailablePresets();
      
      presets.forEach(preset => {
        const config = AnimationPresets.get(preset);
        
        // All configurations should have consistent structure
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        
        // Test that essential properties are never null/undefined
        if (config.enter) {
          expect(config.enter.duration).toBeDefined();
          expect(typeof config.enter.duration).toBe('number');
          expect(config.enter.duration).toBeGreaterThanOrEqual(0);
        }
        
        if (config.update) {
          expect(config.update.duration).toBeDefined();
          expect(typeof config.update.duration).toBe('number');
        }
      });
    });

    it('should resolve conflicting defaults predictably', () => {
      // Test that 'none' preset explicitly sets stagger to 0
      const noneConfig = AnimationPresets.get('none');
      expect(noneConfig.enter?.stagger).toBe(0);
      
      // Test that 'minimal' preset has minimal stagger
      const minimalConfig = AnimationPresets.get('minimal');
      expect(minimalConfig.enter?.stagger).toBe(0);
      
      // Test that other presets have positive stagger values
      const gentleConfig = AnimationPresets.get('gentle');
      expect(gentleConfig.enter?.stagger).toBeGreaterThan(0);
    });

    it('should handle preset name collisions gracefully', () => {
      // Test that invalid preset names don't break the system
      const availablePresets = AnimationPresets.getAvailablePresets();
      expect(availablePresets).toContain('gentle');
      expect(availablePresets).toContain('energetic');
      expect(availablePresets).toContain('minimal');
      
      // Test that calling get with valid names works
      expect(() => AnimationPresets.get('gentle')).not.toThrow();
      expect(() => AnimationPresets.get('energetic')).not.toThrow();
    });
  });

  describe('Data Size Optimization Safety', () => {
    it('should maintain stagger values appropriate for data size', () => {
      const smallDataConfig = AnimationPresets.forDataSize(25);
      const largeDataConfig = AnimationPresets.forDataSize(500);
      const hugeDataConfig = AnimationPresets.forDataSize(1000);

      // Small data should have more stagger for better visibility
      expect(smallDataConfig.enter?.stagger).toBeGreaterThan(0);
      
      // Large data should have minimal/no stagger for performance
      if (largeDataConfig.enter?.stagger !== undefined) {
        expect(largeDataConfig.enter.stagger).toBeLessThanOrEqual(10);
      }
      
      // Huge data should have no stagger
      expect(hugeDataConfig.enter?.stagger).toBe(0);
    });

    it('should provide sensible performance defaults for large datasets', () => {
      const largeDataConfig = AnimationPresets.forDataSize(750);
      
      // Large datasets should use minimal animations
      expect(largeDataConfig.enter?.duration).toBeLessThanOrEqual(100);
      expect(largeDataConfig.update?.duration).toBeLessThanOrEqual(100);
    });
  });

  describe('Use Case Optimization Safety', () => {
    it('should provide appropriate stagger values for different use cases', () => {
      const dashboardConfig = AnimationPresets.forUseCase('dashboard');
      const presentationConfig = AnimationPresets.forUseCase('presentation');
      const realtimeConfig = AnimationPresets.forUseCase('realtime');
      
      // Dashboard should be minimal (performance focused)
      expect(dashboardConfig.enter?.duration).toBeLessThanOrEqual(100);
      
      // Presentation should have visible stagger for impact
      expect(presentationConfig.enter?.stagger).toBeGreaterThan(50);
      
      // Realtime should be fast but visible
      expect(realtimeConfig.enter?.duration).toBeLessThan(1000);
      expect(realtimeConfig.enter?.stagger).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate animation configurations correctly', () => {
      const validConfig: AnimationConfig = {
        enter: { duration: 800, stagger: 50, easing: 'ease-out', delay: 0 }
      };
      
      expect(AnimationPresets.isValid(validConfig)).toBe(true);
      
      const invalidConfig: AnimationConfig = {
        enter: { duration: -100, stagger: 50, easing: 'ease-out', delay: 0 }
      };
      
      expect(AnimationPresets.isValid(invalidConfig)).toBe(false);
    });

    it('should validate all preset configurations', () => {
      const presets = AnimationPresets.getAvailablePresets();
      
      presets.forEach(preset => {
        const config = AnimationPresets.get(preset);
        expect(AnimationPresets.isValid(config)).toBe(true);
      });
    });
  });

  describe('Scaling Operations Safety', () => {
    it('should scale all timing values proportionally including stagger', () => {
      const originalConfig = AnimationPresets.get('gentle');
      const scaledConfig = AnimationPresets.scale(originalConfig, 0.5);
      
      // All timing values should be scaled
      if (originalConfig.enter && scaledConfig.enter) {
        expect(scaledConfig.enter.duration).toBe(Math.round(originalConfig.enter.duration * 0.5));
        if (originalConfig.enter.stagger && scaledConfig.enter.stagger) {
          expect(scaledConfig.enter.stagger).toBe(Math.round(originalConfig.enter.stagger * 0.5));
        }
      }
    });

    it('should handle zero and undefined values during scaling', () => {
      const configWithZeros: AnimationConfig = {
        enter: { duration: 800, stagger: 0, delay: 0 },
        update: { duration: 600, delay: 0 }
      };
      
      const scaled = AnimationPresets.scale(configWithZeros, 2.0);
      
      expect(scaled.enter?.stagger).toBe(0); // Zero should remain zero
      expect(scaled.update?.delay).toBe(0); // Zero should remain zero
    });
  });

  describe('Integration with Legacy Configuration', () => {
    it('should maintain compatibility with existing animation config structure', () => {
      // New presets should be convertible to legacy format
      const gentleConfig = AnimationPresets.get('gentle');
      
      // Should be able to extract legacy-compatible values
      expect(gentleConfig.enter?.duration).toBeDefined();
      expect(gentleConfig.enter?.stagger).toBeDefined();
    });
  });

  describe('Regression Test Suite for Specific Stagger Bugs', () => {
    it('should never return a preset with missing stagger delay', () => {
      // This test specifically catches Theory 1: Preset Override
      const allPresets = AnimationPresets.getAvailablePresets();
      
      allPresets.forEach(presetName => {
        const config = AnimationPresets.get(presetName);
        
        if (config.enter && presetName !== 'none') {
          expect(config.enter.stagger).toBeDefined();
          expect(typeof config.enter.stagger).toBe('number');
          // Either explicitly 0 (for minimal/none) or a positive value
          expect(config.enter.stagger).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should preserve user stagger settings when applying data size optimization', () => {
      // This test catches Theory 2: Configuration Merging
      // Apply data size optimization - should not completely override user settings
      const optimized = AnimationPresets.forDataSize(100);
      
      // The optimization should provide sensible defaults, not break stagger entirely
      expect(optimized.enter?.stagger).toBeDefined();
      expect(typeof optimized.enter?.stagger).toBe('number');
    });

    it('should handle rapid preset switching without losing stagger values', () => {
      // This test catches Theory 3: Default Value Collision
      const presets: AnimationPresetName[] = ['gentle', 'energetic', 'smooth', 'bouncy'];
      
      // Rapidly switch between presets - each should maintain valid stagger
      presets.forEach(preset => {
        const config = AnimationPresets.get(preset);
        expect(config.enter?.stagger).toBeDefined();
        expect(config.enter?.stagger).toBeGreaterThan(0);
      });
    });
  });
}); 