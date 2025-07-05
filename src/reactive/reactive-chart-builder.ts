/**
 * Reactive Chart Builder
 * Extends BaseChartBuilder with reactive data capabilities and error handling
 */

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions, StreamingOptions, StreamingUpdateResult } from '../types/config.js';
import { defaultStreamingOptions } from '../types/config.js';
import { BaseChartBuilder } from '../core/index.js';
import { SimpleObservable, type Observable, type UnsubscribeFunction } from './observable.js';
import { 
  type DataSource, 
  type DataSourceConfig,
  type DataSourceError,
  type DataSourceStatus,
  StaticDataSource,
  WebSocketDataSource,
  PollingDataSource,
  EventDataSource,
  ObservableDataSource
} from './data-sources.js';

/**
 * Error event types for reactive charts
 */
export type ReactiveChartEventType = 
  | 'stream:error'
  | 'stream:reconnected' 
  | 'stream:status-change'
  | 'data:quality-warning'
  | 'data:update'
  | 'config:change';

/**
 * Event payload types
 */
export interface StreamErrorPayload {
  error: DataSourceError;
  source: string;
  retryCount: number;
}

export interface StreamStatusPayload {
  status: DataSourceStatus;
  previousStatus: DataSourceStatus;
  source: string;
}

export interface DataQualityPayload {
  issues: string[];
  severity: 'warning' | 'error';
  data: any[];
}

export type ReactiveChartEventPayload = 
  | StreamErrorPayload
  | StreamStatusPayload 
  | DataQualityPayload
  | any[];

/**
 * Event handler function type
 */
export type ReactiveChartEventHandler = (payload: ReactiveChartEventPayload) => void;

/**
 * Enhanced chart builder with reactive data capabilities and error handling
 */
export abstract class ReactiveChartBuilder<T extends BubbleChartData = BubbleChartData> extends BaseChartBuilder<T> {
  private dataSource: DataSource<T> | null = null;
  private configObservable: SimpleObservable<BubbleChartOptions>;
  private disposers: UnsubscribeFunction[] = [];
  private isReactiveMode = false;
  private eventHandlers = new Map<ReactiveChartEventType, Set<ReactiveChartEventHandler>>();
  
  // Streaming properties
  protected streamingEnabled = false;
  protected streamingOptions: StreamingOptions = defaultStreamingOptions;
  protected currentStreamData: T[] = [];
  
  constructor(config: BubbleChartOptions) {
    super(config);
    this.configObservable = new SimpleObservable<BubbleChartOptions>(config);
    this.setupConfigReactivity();
  }

  /**
   * Add event listener for reactive chart events
   * @param eventType - Type of event to listen for
   * @param handler - Event handler function
   * @returns this for method chaining
   */
  onStream(eventType: ReactiveChartEventType, handler: ReactiveChartEventHandler): this {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return this;
  }

  /**
   * Remove event listener for reactive chart events
   * @param eventType - Type of event
   * @param handler - Event handler to remove
   * @returns this for method chaining
   */
  offStream(eventType: ReactiveChartEventType, handler: ReactiveChartEventHandler): this {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
    return this;
  }

  /**
   * Emit event to all registered handlers
   * @param eventType - Type of event to emit
   * @param payload - Event payload
   */
  protected emit(eventType: ReactiveChartEventType, payload: ReactiveChartEventPayload): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in reactive chart event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Enhanced bind method that accepts various data sources
   * @param source - Observable, Promise, async function, or other data source
   * @returns this for method chaining
   */
  bindTo(source: Observable<T[]> | Promise<T[]> | (() => Promise<T[]>) | (() => T[]) | T[]): this {
    this.enableReactiveMode();
    
    // Handle different source types
    if (Array.isArray(source)) {
      // Static array data
      this.dataSource = new StaticDataSource<T>({ data: source, allowUpdates: true });
    } else if (typeof source === 'function') {
      // Function (sync or async)
      try {
        const result = source();
        if (result && typeof (result as any).then === 'function') {
          // Async function returning promise
          this.dataSource = this.createDataSourceFromPromise(result as Promise<T[]>);
        } else {
          // Sync function returning data
          this.dataSource = new StaticDataSource<T>({ data: result as T[], allowUpdates: true });
        }
      } catch (error) {
        console.error('Error executing function source:', error);
        this.dataSource = new StaticDataSource<T>({ data: [], allowUpdates: true });
      }
    } else if (source && typeof (source as any).then === 'function') {
      // Promise
      this.dataSource = this.createDataSourceFromPromise(source as Promise<T[]>);
    } else if (source && typeof (source as any).subscribe === 'function') {
      // Observable
      this.dataSource = new ObservableDataSource<T>(source as Observable<T[]>);
    } else {
      throw new Error('Unsupported data source type for bindTo()');
    }
    
    this.setupDataReactivity();
    return this;
  }

  /**
   * Create a data source from a promise
   * @param promise - Promise that resolves to data array
   * @returns Static data source that will be populated when promise resolves
   */
  private createDataSourceFromPromise(promise: Promise<T[]>): StaticDataSource<T> {
    // Create empty static source first
    const dataSource = new StaticDataSource<T>({ data: [], allowUpdates: true });
    
    // Update with promise result when it resolves
    promise
      .then(data => {
        if (Array.isArray(data)) {
          dataSource.updateData(data);
        } else {
          console.error('Promise resolved to non-array data:', data);
          this.emit('stream:error', {
            error: {
              type: 'data_parse_error',
              message: 'Promise resolved to non-array data',
              originalError: new Error('Expected array, got: ' + typeof data),
              timestamp: new Date(),
              source: 'promise',
              retryable: false
            },
            source: 'promise',
            retryCount: 0
          });
        }
      })
      .catch(error => {
        console.error('Promise rejected:', error);
        this.emit('stream:error', {
          error: {
            type: 'network_error',
            message: 'Promise rejected',
            originalError: error,
            timestamp: new Date(),
            source: 'promise',
            retryable: true
          },
          source: 'promise',
          retryCount: 0
        });
      });
    
    return dataSource;
  }

  /**
   * Enhanced bindTo with automatic retry for failed promises
   * @param promiseFactory - Function that creates a promise
   * @param options - Retry options
   * @returns this for method chaining
   */
  bindToWithRetry(
    promiseFactory: () => Promise<T[]>,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): this {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    
    this.enableReactiveMode();
    
    const dataSource = new StaticDataSource<T>({ data: [], allowUpdates: true });
    let retryCount = 0;
    
    const attemptLoad = (): void => {
      promiseFactory()
        .then(data => {
          if (Array.isArray(data)) {
            dataSource.updateData(data);
            retryCount = 0; // Reset on success
          } else {
            throw new Error('Expected array data, got: ' + typeof data);
          }
        })
        .catch(error => {
          console.error(`Promise attempt ${retryCount + 1} failed:`, error);
          
          this.emit('stream:error', {
            error: {
              type: 'network_error',
              message: `Promise attempt ${retryCount + 1} failed`,
              originalError: error,
              timestamp: new Date(),
              source: 'promise-retry',
              retryable: retryCount < maxRetries
            },
            source: 'promise-retry',
            retryCount
          });
          
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptLoad, retryDelay * Math.pow(2, retryCount - 1)); // Exponential backoff
          }
        });
    };
    
    attemptLoad();
    this.dataSource = dataSource;
    this.setupDataReactivity();
    
    return this;
  }

  /**
   * Bind to a fetch request with automatic retry
   * @param url - URL to fetch from
   * @param options - Fetch options and retry configuration
   * @returns this for method chaining
   */
  bindToFetch(
    url: string, 
    options: RequestInit & { maxRetries?: number; retryDelay?: number } = {}
  ): this {
    const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;
    
    return this.bindToWithRetry(
      () => fetch(url, fetchOptions).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      }),
      { maxRetries, retryDelay }
    );
  }

  /**
   * Bind to multiple data sources with fallback
   * @param sources - Array of data source factories to try in order
   * @returns this for method chaining
   */
  bindToWithFallback(sources: (() => Promise<T[]>)[]): this {
    this.enableReactiveMode();
    
    const dataSource = new StaticDataSource<T>({ data: [], allowUpdates: true });
    
    const trySource = (index: number): void => {
      if (index >= sources.length) {
        this.emit('stream:error', {
          error: {
            type: 'connection_failed',
            message: 'All data sources failed',
            originalError: new Error('No more sources to try'),
            timestamp: new Date(),
            source: 'fallback',
            retryable: false
          },
          source: 'fallback',
          retryCount: index
        });
        return;
      }
      
      sources[index]!()
        .then(data => {
          if (Array.isArray(data)) {
            dataSource.updateData(data);
          } else {
            throw new Error('Expected array data');
          }
        })
        .catch(error => {
          console.warn(`Data source ${index} failed, trying next...`, error);
          trySource(index + 1);
        });
    };
    
    trySource(0);
    this.dataSource = dataSource;
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
   * Update reactive configuration (unified API)
   * @param newConfig - Partial configuration to merge
   * @returns this for method chaining
   */
  override updateOptions(newConfig: Partial<BubbleChartOptions<T>>): this {
    // Update internal config
    this.config = { ...this.config, ...newConfig } as BubbleChartOptions;
    
    // Emit config change for reactive subscribers
    this.configObservable.next(this.config);
    
    // Emit config change event
    this.emit('config:change', this.config as any);
    
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
   * Manually retry failed data source
   */
  retry(): this {
    if (this.dataSource) {
      this.dataSource.retry();
    }
    return this;
  }

  /**
   * Get current data source status
   */
  get dataSourceStatus(): DataSourceStatus | null {
    return this.dataSource?.status || null;
  }

  /**
   * Check if chart is in reactive mode
   */
  get isReactive(): boolean {
    return this.isReactiveMode;
  }

  /**
   * Enable streaming mode with configuration
   * @param options - Streaming options
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
    
    // Emit data update event
    this.emit('data:update', this.currentStreamData);
    
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
   * Set up reactive data flow with error handling
   */
  private setupDataReactivity(): void {
    if (!this.dataSource) return;
    
    // Subscribe to data changes
    const dataUnsubscribe = this.dataSource.stream.subscribe((newData: T[]) => {
      // Validate data quality
      this.validateDataQuality(newData);
      
      // Update internal data without triggering manual update
      this.chartData = newData;
      this.processedData = this.dataProcessor.process(newData);
      
      // Trigger reactive render
      this.triggerReactiveRender();
      
      // Emit data update event
      this.emit('data:update', newData);
    });
    
    // Subscribe to error events
    const errorUnsubscribe = this.dataSource.errorStream.subscribe((error: DataSourceError) => {
      this.emit('stream:error', {
        error,
        source: error.source,
        retryCount: 0 // TODO: Get actual retry count from data source
      });
    });
    
    // Subscribe to status changes
    let previousStatus: DataSourceStatus = 'idle';
    const statusUnsubscribe = this.dataSource.statusStream.subscribe((status: DataSourceStatus) => {
      // Emit status change event
      this.emit('stream:status-change', {
        status,
        previousStatus,
        source: 'data-source'
      });
      
      // Emit reconnected event when transitioning from error/reconnecting to connected
      if ((previousStatus === 'error' || previousStatus === 'reconnecting') && status === 'connected') {
        this.emit('stream:reconnected', {
          status,
          previousStatus,
          source: 'data-source'
        });
      }
      
      previousStatus = status;
    });
    
    this.disposers.push(dataUnsubscribe, errorUnsubscribe, statusUnsubscribe);
    
    // Start the data source
    this.dataSource.start();
  }

  /**
   * Set up reactive configuration changes
   */
  private setupConfigReactivity(): void {
    const configUnsubscribe = this.configObservable.subscribe((newConfig: BubbleChartOptions) => {
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

  /**
   * Enhanced data quality validation
   * @param data - Data to validate
   */
  protected validateDataQuality(data: T[]): void {
    const issues: string[] = [];
    
    if (!Array.isArray(data)) {
      issues.push('Data is not an array');
    } else if (data.length === 0) {
      issues.push('Data array is empty');
    } else {
      // Check for missing required fields
      const firstItem = data[0];
      if (!firstItem) {
        issues.push('First data item is null or undefined');
      } else {
        // Check for common required fields based on config
        if (typeof this.config.label === 'string' && !(this.config.label in firstItem)) {
          issues.push(`Label field "${this.config.label}" not found in data`);
        }
        if (typeof this.config.size === 'string' && !(this.config.size in firstItem)) {
          issues.push(`Size field "${this.config.size}" not found in data`);
        }
      }
      
      // Check for data inconsistencies
      const nullItems = data.filter(item => item == null).length;
      if (nullItems > 0) {
        issues.push(`${nullItems} null or undefined items found`);
      }
    }
    
    if (issues.length > 0) {
      this.emit('data:quality-warning', {
        issues,
        severity: 'warning' as const,
        data
      });
    }
  }
}



/**
 * Type guard to check if a chart builder is reactive
 */
export function isReactiveChart<T extends BubbleChartData>(
  chart: BaseChartBuilder<T>
): chart is ReactiveChartBuilder<T> {
  return 'isReactive' in chart && typeof (chart as any).bindTo === 'function';
} 