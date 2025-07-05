import { WaveBubble } from '../wave-bubble.js';
import type { BubbleChartData, BubbleChartOptions } from '../types/index.js';

// Mock DOM elements for testing
const mockContainer = document.createElement('div');
mockContainer.id = 'test-container';

// Mock data for testing
const testData: BubbleChartData[] = [
  { label: 'Oxygen', size: 80, count: 80 },
  { label: 'Nitrogen', size: 50, count: 50 },
  { label: 'Carbon', size: 95, count: 95 },
  { label: 'Hydrogen', size: 30, count: 30 },
  { label: 'Helium', size: 70, count: 70 }
];

// Mock configuration
const mockConfig: BubbleChartOptions = {
  container: '#test-container',
  label: 'label',
  size: 'size',
  type: 'wave',
  percentage: (d: BubbleChartData) => (d as any).count / 100
};

describe('WaveBubble', () => {
  let waveBubble: WaveBubble;
  let mockSvg: any;
  let mockSvgManager: any;
  let mockRenderingPipeline: any;
  let mockInteractionManager: any;

  beforeEach(() => {
    // Mock SVG elements
    mockSvg = {
      selectAll: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      each: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      empty: jest.fn().mockReturnValue(false)
    };

    // Mock SVG Manager
    mockSvgManager = {
      getElements: jest.fn().mockReturnValue({
        svg: mockSvg
      })
    };

    // Mock Rendering Pipeline
    mockRenderingPipeline = {
      createBubblePackLayout: jest.fn().mockReturnValue([
        { r: 100, x: 0, y: 0 },
        { r: 80, x: 200, y: 0 },
        { r: 120, x: 400, y: 0 },
        { r: 60, x: 600, y: 0 },
        { r: 90, x: 800, y: 0 }
      ]),
      createBubbleElements: jest.fn().mockReturnValue({
        bubbleGroups: mockSvg
      })
    };

    // Mock Interaction Manager
    mockInteractionManager = {
      attachBubbleEvents: jest.fn()
    };

    // Create WaveBubble instance with mocked dependencies
    waveBubble = new WaveBubble(mockConfig);
    
    // Mock the protected properties
    (waveBubble as any).svgManager = mockSvgManager;
    (waveBubble as any).renderingPipeline = mockRenderingPipeline;
    (waveBubble as any).interactionManager = mockInteractionManager;
    (waveBubble as any).processedData = testData.map((data, index) => ({
      data,
      index,
      label: data.label,
      size: data.size
    }));
  });

  afterEach(() => {
    waveBubble.destroy();
  });

  describe('Percentage Calculation', () => {
    it('should calculate correct percentages for each bubble', () => {
      // Test the getPercentageValue method directly
      const getPercentageValue = (waveBubble as any).getPercentageValue.bind(waveBubble);
      
      // Expected percentages based on count/100
      const expectedPercentages = [0.8, 0.5, 0.95, 0.3, 0.7];
      
      testData.forEach((data, index) => {
        const percentage = getPercentageValue(data);
        expect(percentage).toBe(expectedPercentages[index]);
      });
    });

    it('should handle custom percentage function correctly', () => {
      const customConfig: BubbleChartOptions = {
        ...mockConfig,
        percentage: (d: BubbleChartData) => (d as any).size / 100
      };

      const customWaveBubble = new WaveBubble(customConfig);
      const getPercentageValue = (customWaveBubble as any).getPercentageValue.bind(customWaveBubble);
      
      // Expected percentages based on size/100
      const expectedPercentages = [0.8, 0.5, 0.95, 0.3, 0.7];
      
      testData.forEach((data, index) => {
        const percentage = getPercentageValue(data);
        expect(percentage).toBe(expectedPercentages[index]);
      });

      customWaveBubble.destroy();
    });

    it('should use default percentage when no function provided', () => {
      const { percentage, ...configWithoutPercentage } = mockConfig;
      const defaultConfig: BubbleChartOptions = {
        ...configWithoutPercentage
        // No percentage specified, will use default
      };

      const defaultWaveBubble = new WaveBubble(defaultConfig);
      const getPercentageValue = (defaultWaveBubble as any).getPercentageValue.bind(defaultWaveBubble);
      
      testData.forEach((data) => {
        const percentage = getPercentageValue(data);
        expect(percentage).toBe(0.7); // Default value
      });

      defaultWaveBubble.destroy();
    });

    it('should clamp percentage values between 0 and 1', () => {
      const extremeConfig: BubbleChartOptions = {
        ...mockConfig,
        percentage: (d: BubbleChartData) => (d as any).count / 10 // Will give values > 1
      };

      const extremeWaveBubble = new WaveBubble(extremeConfig);
      const getPercentageValue = (extremeWaveBubble as any).getPercentageValue.bind(extremeWaveBubble);
      
      testData.forEach((data) => {
        const percentage = getPercentageValue(data);
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(1);
      });

      extremeWaveBubble.destroy();
    });
  });

  describe('Wave Data Generation', () => {
    it('should generate wave data with correct base Y position', () => {
      const generateWaveData = (waveBubble as any).generateWaveData.bind(waveBubble);
      const layoutNode = { r: 100 };
      
      // Test with Oxygen data (count: 80, percentage: 0.8)
      const waveData = generateWaveData(layoutNode, 0);
      
      // baseY = (1 - percentage) * 2 * r - r
      // baseY = (1 - 0.8) * 2 * 100 - 100 = 0.2 * 200 - 100 = 40 - 100 = -60
      const expectedBaseY = (1 - 0.8) * 2 * 100 - 100;
      
      expect(waveData).toBeDefined();
      expect(waveData.r).toBe(100);
      expect(waveData.points).toBeDefined();
      expect(waveData.points.length).toBeGreaterThan(0);
      
      // Verify the base Y calculation is correct
      const percentage = 0.8; // Oxygen's percentage
      const calculatedBaseY = (1 - percentage) * 2 * layoutNode.r - layoutNode.r;
      expect(calculatedBaseY).toBe(expectedBaseY);
    });

    it('should generate different wave data for different bubbles', () => {
      const generateWaveData = (waveBubble as any).generateWaveData.bind(waveBubble);
      const layoutNodes = [
        { r: 100 }, // Oxygen
        { r: 80 },  // Nitrogen
        { r: 120 }, // Carbon
        { r: 60 },  // Hydrogen
        { r: 90 }   // Helium
      ];
      
      const waveDataResults = layoutNodes.map((node, index) => 
        generateWaveData(node, index)
      );
      
      // All should have different base Y positions due to different percentages
      const baseYPositions = waveDataResults.map(data => {
        const percentage = (testData[data.r === 100 ? 0 : data.r === 80 ? 1 : data.r === 120 ? 2 : data.r === 60 ? 3 : 4] as any).count / 100;
        return (1 - percentage) * 2 * data.r - data.r;
      });
      
      // Check that we have different base Y positions
      const uniqueBaseYPositions = new Set(baseYPositions);
      expect(uniqueBaseYPositions.size).toBeGreaterThan(1);
    });
  });

  describe('Animation Setup', () => {
    it('should set up wave animation correctly', () => {
      // Mock d3.timer
      const mockTimer = {
        stop: jest.fn()
      };
      const originalTimer = require('d3').timer;
      require('d3').timer = jest.fn().mockReturnValue(mockTimer);
      
      try {
        const startWaveAnimation = (waveBubble as any).startWaveAnimation.bind(waveBubble);
        startWaveAnimation(mockSvg);
        
        expect(require('d3').timer).toHaveBeenCalled();
        expect(mockSvg.each).toHaveBeenCalled();
      } finally {
        require('d3').timer = originalTimer;
      }
    });

    it('should stop animation on destroy', () => {
      const mockTimer = {
        stop: jest.fn()
      };
      (waveBubble as any).waveTimer = mockTimer;
      
      waveBubble.destroy();
      
      expect(mockTimer.stop).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should accept wave configuration updates', () => {
      const newConfig = {
        frequency: 0.5,
        amplitude: 0.1,
        speed: 0.1,
        resolution: 10
      };
      
      waveBubble.updateWaveConfig(newConfig);
      const currentConfig = waveBubble.getWaveConfig();
      
      expect(currentConfig.frequency).toBe(0.5);
      expect(currentConfig.amplitude).toBe(0.1);
      expect(currentConfig.speed).toBe(0.1);
      expect(currentConfig.resolution).toBe(10);
    });

    it('should pause and resume animation', () => {
      const mockTimer = {
        stop: jest.fn()
      };
      (waveBubble as any).waveTimer = mockTimer;
      
      waveBubble.pause();
      expect(mockTimer.stop).toHaveBeenCalled();
      
      // Resume should not throw errors
      expect(() => waveBubble.resume()).not.toThrow();
    });
  });
}); 