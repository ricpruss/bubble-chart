/**
 * Reactive Chart Builder
 * Extends BaseChartBuilder with reactive data capabilities
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig, StreamingOptions, StreamingUpdateResult } from '../types/config.js';
import { defaultStreamingOptions } from '../types/config.js';
import { BaseChartBuilder } from '../core/index.js';
import { SimpleObservable, type Observable, type UnsubscribeFunction } from './observable.js';
import { 
  type DataSource, 
  type DataSourceConfig,
  StaticDataSource,
  WebSocketDataSource,
  PollingDataSource,
  EventDataSource,
  ObservableDataSource
} from './data-sources.js';

/**
 * Enhanced chart builder with reactive data capabilities
 */
export abstract class ReactiveChartBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  private dataSource: DataSource<T> | null = null;
  private configObservable: SimpleObservable<BubbleChartConfig>;
  private disposers: UnsubscribeFunction[] = [];
  private isReactiveMode = false;
  
  // Streaming properties
  protected streamingEnabled = false;
  protected streamingOptions: StreamingOptions = defaultStreamingOptions;
  protected currentStreamData: T[] = [];
  
  constructor(config: BubbleChartConfig) {
    super(config);
    this.configObservable = new SimpleObservable<BubbleChartConfig>(config);
    this.setupConfigReactivity();
  }

  /**
   * Bind chart to a data observable for automatic updates
   * @param source - Observable data source
   * @returns this for method chaining
   */
  bindTo(source: Observable<T[]>): this {
    this.enableReactiveMode();
    
    // Create data source from observable
    this.dataSource = new ObservableDataSource<T>(source);
    this.setupDataReactivity();
    
    return this;
  }

  /**
   * Stream data from various source types
   * @param config - Data source configuration
   * @returns this for method chaining
   */
  streamFrom(config: DataSourceConfig<T>): this {
    this.enableReactiveMode();
    
    // Create appropriate data source
    this.dataSource = this.createDataSource(config);
    this.setupDataReactivity();
    
    return this;
  }

  /**
   * Create computed/derived data transformations
   * @param transform - Function to transform data
   * @returns New observable with transformed data
   */
  computed<U>(transform: (data: T[]) => U[]): Observable<U[]> {
    if (!this.dataSource) {
      throw new Error('Cannot create computed data without a data source. Call bindTo() or streamFrom() first.');
    }
    
    return this.dataSource.stream.map?.(transform) || new SimpleObservable<U[]>();
  }

  /**
   * Override data method to work with reactive mode
   */
  override data(data: T[]): this {
    if (this.isReactiveMode) {
      console.warn('Chart is in reactive mode. Use bindTo() or streamFrom() instead of data().');
      return this;
    }
    
    // Call parent implementation for non-reactive mode
    return super.data(data);
  }

  /**
   * Update reactive configuration
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override setConfig(newConfig: Partial<BubbleChartConfig>): this {
    // Update internal config
    this.config = { ...this.config, ...newConfig };
    
    // Emit config change for reactive subscribers
    this.configObservable.next(this.config);
    
    return this;
  }

  /**
   * Start data streaming (if using streamFrom)
   */
  start(): this {
    if (this.dataSource) {
      this.dataSource.start();
    }
    return this;
  }

  /**
   * Stop data streaming
   */
  stop(): this {
    if (this.dataSource) {
      this.dataSource.stop();
    }
    return this;
  }

  /**
   * Check if chart is in reactive mode
   */
  get isReactive(): boolean {
    return this.isReactiveMode;
  }

  /**
   * Get current data source status
   */
  get dataSourceActive(): boolean {
    return this.dataSource?.isActive || false;
  }

  /**
   * Enable streaming mode with animation options
   * @param options - Streaming animation configuration
   * @returns this for method chaining
   */
  enableStreaming(options: Partial<StreamingOptions> = {}): this {
    this.streamingEnabled = true;
    this.streamingOptions = { ...defaultStreamingOptions, ...options };
    return this;
  }

  /**
   * Set all data at once for streaming chart
   * @param data - Complete data set
   * @returns this for method chaining
   */
  streamData(data: T[]): this {
    if (!this.streamingEnabled) {
      console.warn('Streaming not enabled. Call enableStreaming() first.');
      return this;
    }
    
    this.currentStreamData = [...data];

    // If the chart has not been initialised/rendered yet, do so now
    if (!this.isInitialized) {
      // Use BaseChartBuilder data-processing then render to create SVG & pipeline
      super.data(this.currentStreamData);
      super.render();
    } else {
      // Keep internal data in sync for subsequent non-streaming operations
      super.data(this.currentStreamData);
    }

    this.performStreamingUpdate();
    return this;
  }

  /**
   * Add new data points to the streaming chart
   * @param newItems - New data items to add
   * @returns Streaming update result
   */
  addData(newItems: T | T[]): StreamingUpdateResult {
    if (!this.streamingEnabled) {
      console.warn('Streaming not enabled. Call enableStreaming() first.');
      return { entered: 0, updated: 0, exited: 0 };
    }
    
    const itemsArray = Array.isArray(newItems) ? newItems : [newItems];
    this.currentStreamData = [...this.currentStreamData, ...itemsArray];
    super.data(this.currentStreamData);
    if (!this.isInitialized) {
      super.render();
    }
    return this.performStreamingUpdate();
  }

  /**
   * Update existing data points
   * @param predicate - Function to find items to update
   * @param updates - Partial data for updates
   * @returns Streaming update result
   */
  updateData(predicate: (item: T) => boolean, updates: Partial<T>): StreamingUpdateResult {
    if (!this.streamingEnabled) {
      console.warn('Streaming not enabled. Call enableStreaming() first.');
      return { entered: 0, updated: 0, exited: 0 };
    }
    
    this.currentStreamData = this.currentStreamData.map(item => 
      predicate(item) ? { ...item, ...updates } : item
    );
    super.data(this.currentStreamData);
    if (!this.isInitialized) {
      super.render();
    }
    return this.performStreamingUpdate();
  }

  /**
   * Remove data points from the streaming chart
   * @param predicate - Function to find items to remove
   * @returns Streaming update result
   */
  removeData(predicate: (item: T) => boolean): StreamingUpdateResult {
    if (!this.streamingEnabled) {
      console.warn('Streaming not enabled. Call enableStreaming() first.');
      return { entered: 0, updated: 0, exited: 0 };
    }
    
    this.currentStreamData = this.currentStreamData.filter(item => !predicate(item));
    super.data(this.currentStreamData);
    if (!this.isInitialized) {
      super.render();
    }
    return this.performStreamingUpdate();
  }

  /**
   * Perform streaming update using render pipeline
   * @returns Streaming update result
   */
  performStreamingUpdate() {
    if (!this.streamingEnabled || !this.renderingPipeline) {
      return { entered: 0, updated: 0, exited: 0 };
    }

    // Process the current stream data
    const processedData = this.dataProcessor.process(this.currentStreamData);
    
    // Use render pipeline's streaming update
    return this.renderingPipeline.streamingUpdate(processedData, this.streamingOptions);
  }

  /**
   * Enhanced destroy method with reactive cleanup
   */
  override destroy(): void {
    this.disposeReactive();
    super.destroy();
  }

  /**
   * Enable reactive mode and disable manual updates
   */
  private enableReactiveMode(): void {
    this.isReactiveMode = true;
    
    // Clean up any existing reactive setup
    this.disposeReactive();
  }

  /**
   * Create appropriate data source based on configuration
   */
  private createDataSource(config: DataSourceConfig<T>): DataSource<T> {
    if (config.static) {
      return new StaticDataSource<T>(config.static);
    }
    
    if (config.websocket) {
      return new WebSocketDataSource<T>(config.websocket);
    }
    
    if (config.polling) {
      return new PollingDataSource<T>(config.polling);
    }
    
    if (config.events) {
      return new EventDataSource<T>(config.events);
    }
    
    if (config.observable) {
      return new ObservableDataSource<T>(config.observable);
    }
    
    throw new Error('No valid data source configuration provided');
  }

  /**
   * Set up reactive data flow
   */
  private setupDataReactivity(): void {
    if (!this.dataSource) return;
    
    // Subscribe to data changes
    const dataUnsubscribe = this.dataSource.stream.subscribe((newData: T[]) => {
      // Update internal data without triggering manual update
      this.chartData = newData;
      this.processedData = this.dataProcessor.process(newData);
      
      // Trigger reactive render
      this.triggerReactiveRender();
    });
    
    this.disposers.push(dataUnsubscribe);
    
    // Start the data source
    this.dataSource.start();
  }

  /**
   * Set up reactive configuration changes
   */
  private setupConfigReactivity(): void {
    const configUnsubscribe = this.configObservable.subscribe((newConfig: BubbleChartConfig) => {
      // Update data processor with new config
      this.dataProcessor = new (this.dataProcessor.constructor as any)(newConfig);
      
      // Re-process current data if available
      if (this.chartData.length > 0) {
        this.processedData = this.dataProcessor.process(this.chartData);
        this.triggerReactiveRender();
      }
    });
    
    this.disposers.push(configUnsubscribe);
  }

  /**
   * Trigger render for reactive updates
   */
  private triggerReactiveRender(): void {
    // Use requestAnimationFrame to batch rapid updates
    requestAnimationFrame(() => {
      if (this.chartData.length > 0) {
        this.render();
      }
    });
  }

  /**
   * Clean up all reactive subscriptions
   */
  private disposeReactive(): void {
    // Dispose all subscriptions
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
    
    // Stop and dispose data source
    if (this.dataSource) {
      this.dataSource.dispose();
      this.dataSource = null;
    }
  }
}

/**
 * Utility function to create reactive chart from data source
 */
export function createReactiveChart<T extends BubbleChartData>(
  ChartClass: new (config: BubbleChartConfig) => ReactiveChartBuilder<T>,
  config: BubbleChartConfig,
  dataSourceConfig: DataSourceConfig<T>
): ReactiveChartBuilder<T> {
  const chart = new ChartClass(config);
  chart.streamFrom(dataSourceConfig);
  return chart;
}

/**
 * Type guard to check if a chart builder is reactive
 */
export function isReactiveChart<T extends BubbleChartData>(
  chart: BaseChartBuilder<T>
): chart is ReactiveChartBuilder<T> {
  return 'isReactive' in chart && typeof (chart as any).bindTo === 'function';
} 