import type { BubbleChartData } from '../types/data.js';
import type { StreamingOptions } from '../types/config.js';
import type { BaseChartBuilder } from '../core/index.js';
import { DataStore } from './store.js';

/**
 * Manages data flow between the reactive store and chart builders
 * Extracted from reactive/chart.ts to provide clear separation of concerns
 * and prevent the data flow issues discovered during wave bubble debugging
 */
export class DataFlowManager<T extends BubbleChartData = BubbleChartData> {
  private store: DataStore<T>;
  private builder: BaseChartBuilder<T>;
  private isInitialized = false;

  constructor(
    store: DataStore<T>,
    builder: BaseChartBuilder<T>
  ) {
    this.store = store;
    this.builder = builder;
  }

  /**
   * Initialize the chart with data and trigger initial render
   * Ensures data flows correctly to the builder before rendering
   * @param data - Initial data array
   * @returns True if successful, false if validation failed
   */
  initializeWithData(data: T[]): boolean {
    console.log('DataFlowManager: Initializing with', data.length, 'data items');
    
    // Validate data before proceeding
    if (!this.validateData(data)) {
      console.error('DataFlowManager: Data validation failed');
      return false;
    }

    // Add data to store first
    this.store.addMany(data);
    
    // Verify data reached the store
    const storeData = this.store.data();
    if (storeData.length !== data.length) {
      console.error('DataFlowManager: Data not properly stored. Expected:', data.length, 'Got:', storeData.length);
      return false;
    }

    // Then render with the data
    this.renderWithValidation();
    this.isInitialized = true;
    
    console.log('DataFlowManager: Successfully initialized with data');
    return true;
  }

  /**
   * Render the chart with comprehensive data flow validation
   * Prevents the silent failure mode discovered in wave bubble debugging
   */
  renderWithValidation(): void {
    const currentData = [...this.store.data()] as T[];
    console.log('DataFlowManager: renderWithValidation() called with', currentData.length, 'data items');
    
    // Validate data flow before rendering
    if (currentData.length === 0) {
      console.warn('DataFlowManager: Attempting to render with empty data - this may cause specialized builders to not display properly');
    }

    // Pass data to builder and render
    console.log('DataFlowManager: Passing data to builder:', this.builder.constructor.name);
    this.builder.data(currentData).render();
    
    // Verify the builder received the data
    const builderData = (this.builder as any).chartData;
    if (builderData?.length !== currentData.length) {
      console.error('DataFlowManager: Builder did not receive data properly. Expected:', currentData.length, 'Got:', builderData?.length || 0);
    } else {
      console.log('DataFlowManager: Data flow validation successful');
    }
  }

  /**
   * Handle streaming updates with proper data flow coordination
   * @param stats - Change statistics from the store
   * @param streamingOptions - Optional streaming configuration
   */
  handleStreamingUpdate(stats: any, streamingOptions?: StreamingOptions): void {
    console.log('DataFlowManager: Handling streaming update:', stats);
    
    // Skip streaming updates if not initialized
    if (!this.isInitialized) {
      console.log('DataFlowManager: Skipping streaming update - not initialized');
      return;
    }

    const currentData = [...this.store.data()] as T[];
    
    // Special handling for physics-based builders that don't support streaming
    if (this.isPhysicsBasedBuilder()) {
      console.log('DataFlowManager: Using full re-render for physics-based builder');
      this.builder.data(currentData).render();
      return;
    }

    // Use streaming update if builder supports it
    if (streamingOptions && this.supportsStreaming()) {
      console.log('DataFlowManager: Using streaming update');
      this.performStreamingUpdate(currentData, streamingOptions);
    } else {
      console.log('DataFlowManager: Using regular render');
      this.builder.data(currentData).render();
    }
  }

  /**
   * Validate data before processing
   * @param data - Data to validate
   * @returns True if data is valid, false otherwise
   */
  private validateData(data: T[]): boolean {
    if (!Array.isArray(data)) {
      console.error('DataFlowManager: Data must be an array, got:', typeof data);
      return false;
    }

    if (data.length === 0) {
      console.warn('DataFlowManager: Data array is empty');
      return true; // Empty data is valid, just not useful
    }

    // Check for null/undefined items
    const nullItems = data.filter(item => item == null).length;
    if (nullItems > 0) {
      console.warn('DataFlowManager: Found', nullItems, 'null/undefined items in data');
    }

    // Basic structure validation
    const firstItem = data[0];
    if (typeof firstItem !== 'object') {
      console.error('DataFlowManager: Data items must be objects, got:', typeof firstItem);
      return false;
    }

    return true;
  }

  /**
   * Check if the current builder is physics-based and doesn't support streaming
   * @returns True if builder uses physics simulations
   */
  private isPhysicsBasedBuilder(): boolean {
    const builderName = this.builder.constructor.name;
    return builderName === 'MotionBubble' || builderName === 'OrbitBuilder';
  }

  /**
   * Check if the current builder supports streaming updates
   * @returns True if builder supports streaming
   */
  private supportsStreaming(): boolean {
    const builder = this.builder as any;
    return builder.renderingPipeline && typeof builder.renderingPipeline.streamingUpdate === 'function';
  }

  /**
   * Perform streaming update using the builder's rendering pipeline
   * @param data - Current data array
   * @param options - Streaming options
   */
  private performStreamingUpdate(data: T[], options: StreamingOptions): void {
    try {
      // Process data without triggering builder's render
      this.builder.data(data);
      const processedData = (this.builder as any).processedData;
      
      // Get the rendering pipeline from the builder
      const renderingPipeline = (this.builder as any).renderingPipeline;
      
      if (!renderingPipeline || !(this.builder as any).isInitialized) {
        throw new Error('Builder not fully initialized for streaming update');
      }
      
      // Perform streaming update
      renderingPipeline.streamingUpdate(processedData, options);
      console.log('DataFlowManager: Streaming update completed successfully');
      
    } catch (error) {
      console.warn('DataFlowManager: Streaming update failed, falling back to render:', error);
      this.builder.data(data).render();
    }
  }

  /**
   * Get current initialization status
   * @returns True if initialized, false otherwise
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset the data flow manager
   */
  reset(): void {
    this.isInitialized = false;
    console.log('DataFlowManager: Reset completed');
  }
}
