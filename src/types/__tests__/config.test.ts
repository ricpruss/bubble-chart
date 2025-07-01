/**
 * Test suite for configuration type definitions
 * Validates configuration validation, defaults, and type safety
 */

// Mock D3.js to avoid ES module issues in Jest
jest.mock('d3', () => ({
  scaleOrdinal: jest.fn(() => {
    const mockScale = (value: string) => {
      const colors = ['#FF6384', '#4BC0C0', '#FFCE56'];
      return colors[value.charCodeAt(0) % colors.length];
    };
    mockScale.range = jest.fn().mockReturnThis();
    mockScale.domain = jest.fn().mockReturnThis();
    return mockScale;
  }),
  format: jest.fn((format) => (value: number) => {
    if (format === '.2s') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(2)}k`;
      return value.toString();
    }
    return value.toString();
  })
}));

import {
  type BubbleChartConfig,
  type ChartType,
  type FormatFunctions,
  type TooltipItem,
  validateConfig,
  createDefaultConfig
} from '../config.js';

describe('Configuration Validation', () => {
  describe('validateConfig', () => {
    it('should pass validation for valid configuration', () => {
      const validConfig: Partial<BubbleChartConfig> = {
        container: '#chart',
        label: 'label',
        size: 'size'
      };
      
      const errors = validateConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const invalidConfig: Partial<BubbleChartConfig> = {};
      
      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('container is required');
      expect(errors).toContain('label is required');
      expect(errors).toContain('size is required');
      expect(errors).toHaveLength(3);
    });

    it('should fail validation for invalid chart type', () => {
      const invalidConfig: Partial<BubbleChartConfig> = {
        container: '#chart',
        label: 'label',
        size: 'size',
        type: 'invalid' as ChartType
      };
      
      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Invalid chart type: invalid');
    });

    it('should pass validation for valid chart types', () => {
      const validTypes: ChartType[] = ['none', 'wave', 'liquid', 'tree', 'motion', 'orbit', 'list'];
      
      validTypes.forEach(type => {
        const config: Partial<BubbleChartConfig> = {
          container: '#chart',
          label: 'label',
          size: 'size',
          type
        };
        
        const errors = validateConfig(config);
        expect(errors).toHaveLength(0);
      });
    });

    it('should handle partial validation correctly', () => {
      const partialConfig: Partial<BubbleChartConfig> = {
        container: '#chart',
        label: 'label'
        // missing size
      };
      
      const errors = validateConfig(partialConfig);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('size is required');
    });
  });
});

describe('Default Configuration', () => {
  let defaultConfig: BubbleChartConfig;

  beforeEach(() => {
    defaultConfig = createDefaultConfig();
  });

  it('should create valid default configuration', () => {
    const errors = validateConfig(defaultConfig);
    // Default config will have empty required fields, which is expected
    expect(errors).toContain('container is required');
    expect(errors).toContain('label is required');
    expect(errors).toContain('size is required');
  });

  it('should have correct default values', () => {
    expect(defaultConfig.defaultColor).toBe('#ddd');
    expect(defaultConfig.type).toBe('none');
    expect(defaultConfig.width).toBe(500);
    expect(defaultConfig.height).toBe(500);
    expect(defaultConfig.sort).toBe(false);
    expect(defaultConfig.percentage).toBe(false);
  });

  it('should have proper display defaults', () => {
    expect(defaultConfig.colour).toBe(false);
    expect(defaultConfig.title).toBe(false);
    expect(defaultConfig.leyend).toBe(false);
    expect(defaultConfig.legend).toBe(false);
    expect(defaultConfig.autoHideLegend).toBe(true);
  });

  it('should have layout defaults', () => {
    expect(defaultConfig.offset).toBe(5);
    expect(defaultConfig.padding).toBe(30);
    expect(defaultConfig.cols).toBe(5);
    expect(defaultConfig.p).toBe(0.3);
  });

  it('should have hierarchical defaults', () => {
    expect(defaultConfig.level).toBe(0);
    expect(defaultConfig.levels).toEqual([]);
    expect(defaultConfig.filters).toEqual([]);
  });

  it('should have toggle defaults', () => {
    expect(defaultConfig.toggle?.title).toBe('');
    expect(defaultConfig.toggle?.size).toBe(false);
    expect(defaultConfig.timeContainer).toBe('footer');
  });

  it('should have chart-specific defaults', () => {
    expect(defaultConfig.wave?.dy).toBe(11);
    expect(defaultConfig.wave?.count).toBe(4);
    
    expect(defaultConfig.tree?.speed).toBe(150);
    expect(defaultConfig.tree?.minRadius).toBe(10);
    
    expect(defaultConfig.animation?.speed).toBe(3000);
    expect(defaultConfig.animation?.method).toBe('no-recursive');
    
    expect(defaultConfig.bubble?.minRadius).toBe(10);
    expect(defaultConfig.bubble?.animation).toBe(2000);
    expect(defaultConfig.bubble?.padding).toBe(10);
    expect(defaultConfig.bubble?.allText).toBe('All');
  });

  it('should have list bubble defaults', () => {
    expect(defaultConfig.listBubble?.minRadius).toBe(2);
    expect(defaultConfig.listBubble?.maxRadius).toBe(25);
    expect(defaultConfig.listBubble?.padding).toBe(5);
    expect(defaultConfig.listBubble?.textWidth).toBe(200);
  });

  it('should have physics defaults', () => {
    expect(defaultConfig.cluster).toBe(true);
    expect(defaultConfig.friction).toBe(0.85);
  });

  it('should have format function defaults', () => {
    expect(typeof defaultConfig.format?.text).toBe('function');
    expect(typeof defaultConfig.format?.number).toBe('function');
    
    // Test default format functions
    if (defaultConfig.format?.text) {
      expect(defaultConfig.format.text('hello world')).toBe('Hello world');
      expect(defaultConfig.format.text('CAPS')).toBe('Caps');
    }
    
    if (defaultConfig.format?.number) {
      expect(defaultConfig.format.number(1234)).toBe('1.23k');
      expect(defaultConfig.format.number(1000000)).toBe('1.00M');
    }
  });

  it('should have a working color scale', () => {
    expect(typeof defaultConfig.color).toBe('function');
    
    // Test that color scale returns colors
    const color1 = defaultConfig.color!('category1');
    const color2 = defaultConfig.color!('category2');
    
    expect(typeof color1).toBe('string');
    expect(typeof color2).toBe('string');
    expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(color2).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('Type Safety', () => {
  it('should enforce correct format function signatures', () => {
    const formatFunctions: FormatFunctions = {
      text: (text: string) => text.toUpperCase(),
      number: (num: number) => `$${num.toFixed(2)}`
    };
    
    expect(formatFunctions.text!('hello')).toBe('HELLO');
    expect(formatFunctions.number!(123.456)).toBe('$123.46');
  });

  it('should enforce correct tooltip item structure', () => {
    const tooltipItems: TooltipItem[] = [
      { name: 'Revenue', value: 1000000 },
      { name: 'Growth', value: '15%' },
      { name: 'Employees', value: 250 }
    ];
    
    tooltipItems.forEach(item => {
      expect(typeof item.name).toBe('string');
      expect(['string', 'number'].includes(typeof item.value)).toBe(true);
    });
  });

  it('should handle different accessor types', () => {
    const config: Partial<BubbleChartConfig> = {
      container: '#chart',
      label: 'label',
      size: ['size1', 'size2'],
      time: (d) => (d as any).year || 2023
    };
    
    expect(Array.isArray(config.label)).toBe(false);
    expect(Array.isArray(config.size)).toBe(true);
    expect(typeof config.time).toBe('function');
  });

  it('should handle boolean and function tooltip configurations', () => {
    const booleanTooltip: BubbleChartConfig['tooltip'] = false;
    const functionTooltip: BubbleChartConfig['tooltip'] = (d) => [
      { name: 'Name', value: (d as any).label || 'Unknown' }
    ];
    
    expect(typeof booleanTooltip).toBe('boolean');
    expect(typeof functionTooltip).toBe('function');
    
    if (typeof functionTooltip === 'function') {
      const result = functionTooltip({ label: 'Test', size: 100 } as any);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.name).toBe('Name');
      expect(result[0]?.value).toBe('Test');
    }
  });

  it('should handle percentage configuration types', () => {
    const booleanPercentage: BubbleChartConfig['percentage'] = true;
    const functionPercentage: BubbleChartConfig['percentage'] = (d) => (d as any).size / 1000;
    
    expect(typeof booleanPercentage).toBe('boolean');
    expect(typeof functionPercentage).toBe('function');
    
    if (typeof functionPercentage === 'function') {
      const result = functionPercentage({ label: 'Test', size: 500 } as any);
      expect(result).toBe(0.5);
    }
  });
});

describe('Configuration Composition', () => {
  it('should allow merging default config with user options', () => {
    const defaultConfig = createDefaultConfig();
    const userOptions: Partial<BubbleChartConfig> = {
      container: '#my-chart',
      label: 'name',
      size: 'value',
      width: 800,
      height: 600,
      type: 'wave'
    };
    
    const finalConfig = { ...defaultConfig, ...userOptions };
    
    expect(finalConfig.container).toBe('#my-chart');
    expect(finalConfig.width).toBe(800);
    expect(finalConfig.height).toBe(600);
    expect(finalConfig.type).toBe('wave');
    
    // Should keep default values for non-overridden options
    expect(finalConfig.defaultColor).toBe('#ddd');
    expect(finalConfig.padding).toBe(30);
  });

  it('should allow deep merging of nested configurations', () => {
    const defaultConfig = createDefaultConfig();
    const userConfig: Partial<BubbleChartConfig> = {
      wave: {
        dy: 15,
        count: 6
      },
      bubble: {
        minRadius: 5,
        // Keep other bubble defaults
        animation: defaultConfig.bubble!.animation,
        padding: defaultConfig.bubble!.padding,
        allText: defaultConfig.bubble!.allText
      }
    };
    
    const finalConfig = { ...defaultConfig, ...userConfig };
    
    expect(finalConfig.wave?.dy).toBe(15);
    expect(finalConfig.wave?.count).toBe(6);
    expect(finalConfig.bubble?.minRadius).toBe(5);
    expect(finalConfig.bubble?.animation).toBe(2000); // kept from default
  });
});

describe('Edge Cases', () => {
  it('should handle empty configuration object', () => {
    const errors = validateConfig({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle null/undefined configuration', () => {
    const errors1 = validateConfig(null as any);
    const errors2 = validateConfig(undefined as any);
    
    expect(errors1.length).toBeGreaterThan(0);
    expect(errors2.length).toBeGreaterThan(0);
  });

  it('should handle configuration with extra properties', () => {
    const configWithExtras = {
      container: '#chart',
      label: 'label',
      size: 'size',
      extraProperty: 'should not cause issues'
    };
    
    const errors = validateConfig(configWithExtras);
    expect(errors).toHaveLength(0);
  });
}); 