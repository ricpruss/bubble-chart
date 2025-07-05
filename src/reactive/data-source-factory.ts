/**
 * Data Source Factory
 * Unified creation and management of different data source types with enhanced resilience
 */

import type { BubbleChartData } from '../types/data.js';
import type { Observable } from './observable.js';
import { 
  type DataSource,
  type DataSourceConfig,
  type ErrorRecoveryConfig,
  defaultErrorRecovery,
  StaticDataSource,
  WebSocketDataSource, 
  PollingDataSource,
  EventDataSource,
  ObservableDataSource
} from './data-sources.js';

/**
 * Enhanced factory configuration
 */
export interface DataSourceFactoryConfig {
  /** Global error recovery settings */
  errorRecovery?: Partial<ErrorRecoveryConfig>;
  /** Enable automatic health checks */
  healthCheck?: boolean;
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;
  /** Fallback data sources */
  fallbackSources?: DataSourceConfig[];
}

/**
 * Factory class for creating data sources with enhanced resilience
 */
export class DataSourceFactory {
  private static globalConfig: DataSourceFactoryConfig = {
    errorRecovery: defaultErrorRecovery,
    healthCheck: false,
    healthCheckInterval: 30000
  };

  /**
   * Configure global factory settings
   * @param config - Global configuration
   */
  static configure(config: DataSourceFactoryConfig): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  /**
   * Create a data source from configuration with enhanced resilience
   * @param config - Data source configuration
   * @param factoryConfig - Factory-specific configuration
   * @returns Appropriate data source instance
   */
  static create<T extends BubbleChartData = BubbleChartData>(
    config: DataSourceConfig<T>,
    factoryConfig?: DataSourceFactoryConfig
  ): DataSource<T> {
    const mergedConfig = { ...this.globalConfig, ...factoryConfig };
    
    // Validate that exactly one source type is provided
    const sourceTypes = [
      config.static,
      config.websocket,
      config.polling,
      config.events,
      config.observable
    ].filter(source => source !== undefined);

    if (sourceTypes.length === 0) {
      throw new Error('No data source configuration provided');
    }

    if (sourceTypes.length > 1) {
      throw new Error('Multiple data source types provided. Please specify only one.');
    }

    // Apply global error recovery settings
    const errorRecovery = { ...mergedConfig.errorRecovery };

    // Create appropriate source with enhanced error handling
    if (config.static) {
      return new StaticDataSource<T>(config.static);
    }

    if (config.websocket) {
      this.validateWebSocketConfig(config.websocket);
      const enhancedConfig = {
        ...config.websocket,
        errorRecovery: { ...errorRecovery, ...config.websocket.errorRecovery }
      };
      return new WebSocketDataSource<T>(enhancedConfig);
    }

    if (config.polling) {
      this.validatePollingConfig(config.polling);
      const enhancedConfig = {
        ...config.polling,
        errorRecovery: { ...errorRecovery, ...config.polling.errorRecovery }
      };
      return new PollingDataSource<T>(enhancedConfig);
    }

    if (config.events) {
      this.validateEventConfig(config.events);
      const enhancedConfig = {
        ...config.events,
        errorRecovery: { ...errorRecovery, ...config.events.errorRecovery }
      };
      return new EventDataSource<T>(enhancedConfig);
    }

    if (config.observable) {
      this.validateObservableConfig(config.observable);
      return new ObservableDataSource<T>(config.observable);
    }

    throw new Error('Invalid data source configuration');
  }

  /**
   * Create a resilient data source with automatic fallback
   * @param primaryConfig - Primary data source configuration
   * @param fallbackConfigs - Array of fallback configurations
   * @returns Data source with automatic failover
   */
  static createWithFallback<T extends BubbleChartData = BubbleChartData>(
    primaryConfig: DataSourceConfig<T>,
    _fallbackConfigs: DataSourceConfig<T>[] = []
  ): DataSource<T> {
    // TODO: Implement fallback data source wrapper
    // For now, just create the primary source
    return this.create(primaryConfig);
  }

  /**
   * Create data source with health monitoring
   * @param config - Data source configuration
   * @param healthCheckConfig - Health check configuration
   * @returns Data source with health monitoring
   */
  static createWithHealthCheck<T extends BubbleChartData = BubbleChartData>(
    config: DataSourceConfig<T>,
    _healthCheckConfig?: { interval?: number; timeout?: number }
  ): DataSource<T> {
    const dataSource = this.create(config);
    
    // TODO: Implement health check wrapper
    // For now, just return the regular data source
    return dataSource;
  }

  /**
   * Create data source from static data with enhanced features
   * @param data - Static data array
   * @param options - Enhanced options
   * @returns Static data source
   */
  static fromStatic<T extends BubbleChartData = BubbleChartData>(
    data: T[],
    options: { 
      allowUpdates?: boolean;
      validateData?: boolean;
      errorRecovery?: Partial<ErrorRecoveryConfig>;
    } = {}
  ): StaticDataSource<T> {
    const { allowUpdates = false, validateData = true } = options;
    
    if (validateData) {
      this.validateStaticData(data);
    }
    
    return new StaticDataSource<T>({ data, allowUpdates });
  }

  /**
   * Create data source from WebSocket URL with resilience
   * @param url - WebSocket URL
   * @param options - Enhanced WebSocket options
   * @returns WebSocket data source
   */
  static fromWebSocket<T extends BubbleChartData = BubbleChartData>(
    url: string,
    options: Partial<NonNullable<DataSourceConfig<T>['websocket']>> & {
      autoReconnect?: boolean;
      maxReconnectAttempts?: number;
      heartbeat?: boolean;
    } = {}
  ): WebSocketDataSource<T> {
    const {
      autoReconnect = true,
      maxReconnectAttempts = 5,
      heartbeat = true,
      ...wsOptions
    } = options;

         const enhancedConfig = {
       url,
       reconnect: autoReconnect,
       maxReconnectAttempts,
       ...(heartbeat && { heartbeatInterval: 30000 }),
       errorRecovery: {
         ...defaultErrorRecovery,
         maxRetries: maxReconnectAttempts
       },
       ...wsOptions
     };

    return new WebSocketDataSource<T>(enhancedConfig);
  }

  /**
   * Create data source from polling endpoint with retry logic
   * @param url - HTTP endpoint URL
   * @param interval - Polling interval in milliseconds
   * @param options - Enhanced polling options
   * @returns Polling data source
   */
  static fromPolling<T extends BubbleChartData = BubbleChartData>(
    url: string,
    interval: number,
    options: Partial<NonNullable<DataSourceConfig<T>['polling']>> & {
      timeout?: number;
      retryOnError?: boolean;
      exponentialBackoff?: boolean;
    } = {}
  ): PollingDataSource<T> {
    const {
      timeout = 10000,
      retryOnError = true,
      exponentialBackoff = true,
      ...pollingOptions
    } = options;

    const enhancedConfig = {
      url,
      interval,
      timeout,
      errorRecovery: {
        ...defaultErrorRecovery,
        maxRetries: retryOnError ? 3 : 0,
        backoffFactor: exponentialBackoff ? 2 : 1
      },
      ...pollingOptions
    };

    return new PollingDataSource<T>(enhancedConfig);
  }

  /**
   * Create data source from DOM events with error handling
   * @param target - Event target
   * @param eventType - Event type to listen for
   * @param transform - Function to transform events to data
   * @param options - Enhanced event options
   * @returns Event data source
   */
  static fromEvents<T extends BubbleChartData = BubbleChartData>(
    target: EventTarget,
    eventType: string,
    transform?: (event: Event) => T[],
    options: {
      validateEvents?: boolean;
      errorRecovery?: Partial<ErrorRecoveryConfig>;
    } = {}
  ): EventDataSource<T> {
    const config = {
      target,
      eventType,
      transform,
      errorRecovery: { ...defaultErrorRecovery, ...options.errorRecovery }
    } as any;

    return new EventDataSource<T>(config);
  }

  /**
   * Create data source from observable with error handling
   * @param observable - Observable to wrap
   * @param options - Enhanced observable options
   * @returns Observable data source
   */
  static fromObservable<T extends BubbleChartData = BubbleChartData>(
    observable: Observable<T[]>,
    _options: {
      errorRecovery?: Partial<ErrorRecoveryConfig>;
      validateData?: boolean;
    } = {}
  ): ObservableDataSource<T> {
    // TODO: Add error handling wrapper
    return new ObservableDataSource<T>(observable);
  }

  /**
   * Auto-detect data source type from input with resilience
   * @param input - Various input types
   * @param options - Auto-detection options
   * @returns Appropriate data source
   */
  static autoDetect<T extends BubbleChartData = BubbleChartData>(
    input: any,
    options: {
      enableRetry?: boolean;
      validateData?: boolean;
      errorRecovery?: Partial<ErrorRecoveryConfig>;
    } = {}
  ): DataSource<T> {
    const { enableRetry = true, validateData = true, errorRecovery } = options;

    // Array data
    if (Array.isArray(input)) {
             return this.fromStatic<T>(input, { allowUpdates: true, validateData, ...(errorRecovery && { errorRecovery }) });
    }

    // Observable-like object
    if (input && typeof input.subscribe === 'function') {
      const observableOptions: { errorRecovery?: Partial<ErrorRecoveryConfig>; validateData?: boolean } = { validateData };
      if (errorRecovery) {
        observableOptions.errorRecovery = errorRecovery;
      }
      return this.fromObservable<T>(input, observableOptions);
    }

    // URL string (assume polling)
    if (typeof input === 'string') {
      if (input.startsWith('ws://') || input.startsWith('wss://')) {
        return this.fromWebSocket<T>(input, { 
          autoReconnect: enableRetry,
          maxReconnectAttempts: errorRecovery?.maxRetries || 3
        });
      }
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return this.fromPolling<T>(input, 5000, { 
          retryOnError: enableRetry,
          ...errorRecovery && { errorRecovery }
        });
      }
    }

    // Configuration object
    if (typeof input === 'object' && input !== null) {
      const factoryConfig: DataSourceFactoryConfig = {};
      if (errorRecovery) {
        factoryConfig.errorRecovery = errorRecovery;
      }
      return this.create<T>(input, factoryConfig);
    }

    throw new Error('Unable to auto-detect data source type from input');
  }

  /**
   * Create a load-balanced data source from multiple sources
   * @param sources - Array of data source configurations
   * @param strategy - Load balancing strategy
   * @returns Load-balanced data source
   */
  static createLoadBalanced<T extends BubbleChartData = BubbleChartData>(
    sources: DataSourceConfig<T>[],
    _strategy: 'round-robin' | 'random' | 'failover' = 'failover'
  ): DataSource<T> {
    if (sources.length === 0) {
      throw new Error('At least one source configuration is required');
    }
    
    const firstSource = sources[0];
    if (!firstSource) {
      throw new Error('First source configuration is invalid');
    }
    
    // For now, implement failover strategy (use first available source)
    // TODO: Implement other load balancing strategies
    return this.create(firstSource);
  }

  /**
   * Validate static data
   */
  private static validateStaticData<T>(data: T[]): void {
    if (!Array.isArray(data)) {
      throw new Error('Static data must be an array');
    }
    
    if (data.length === 0) {
      console.warn('Static data array is empty');
    }
    
    // Check for basic data consistency
    const nullItems = data.filter(item => item == null).length;
    if (nullItems > 0) {
      console.warn(`Found ${nullItems} null or undefined items in static data`);
    }
  }

  /**
   * Validate WebSocket configuration
   */
  private static validateWebSocketConfig(config: any): void {
    if (!config.url || typeof config.url !== 'string') {
      throw new Error('WebSocket configuration must include a valid URL');
    }

    if (config.reconnectDelay && (typeof config.reconnectDelay !== 'number' || config.reconnectDelay < 0)) {
      throw new Error('WebSocket reconnectDelay must be a positive number');
    }
  }

  /**
   * Validate polling configuration
   */
  private static validatePollingConfig(config: any): void {
    if (!config.url || typeof config.url !== 'string') {
      throw new Error('Polling configuration must include a valid URL');
    }

    if (!config.interval || typeof config.interval !== 'number' || config.interval <= 0) {
      throw new Error('Polling configuration must include a positive interval');
    }

    if (config.method && !['GET', 'POST'].includes(config.method)) {
      throw new Error('Polling method must be GET or POST');
    }
  }

  /**
   * Validate event configuration
   */
  private static validateEventConfig(config: any): void {
    if (!config.target) {
      throw new Error('Event configuration must include a target');
    }

    if (!config.eventType || typeof config.eventType !== 'string') {
      throw new Error('Event configuration must include a valid eventType');
    }
  }

  /**
   * Validate observable configuration
   */
  private static validateObservableConfig(observable: any): void {
    if (!observable || typeof observable.subscribe !== 'function') {
      throw new Error('Observable must have a subscribe method');
    }
  }
}

/**
 * Convenience object for creating data sources
 */
export const DataSourceHelpers = {
  /**
   * Create from static data
   */
  static: <T extends BubbleChartData = BubbleChartData>(data: T[], allowUpdates = false) =>
    DataSourceFactory.fromStatic<T>(data, { allowUpdates }),

  /**
   * Create from WebSocket
   */
  websocket: <T extends BubbleChartData = BubbleChartData>(
    url: string,
    options?: Partial<NonNullable<DataSourceConfig<T>['websocket']>>
  ) => DataSourceFactory.fromWebSocket<T>(url, options),

  /**
   * Create from polling
   */
  polling: <T extends BubbleChartData = BubbleChartData>(
    url: string,
    interval: number,
    options?: Partial<NonNullable<DataSourceConfig<T>['polling']>>
  ) => DataSourceFactory.fromPolling<T>(url, interval, options),

  /**
   * Create from events
   */
  events: <T extends BubbleChartData = BubbleChartData>(
    target: EventTarget,
    eventType: string,
    transform?: (event: Event) => T[]
  ) => DataSourceFactory.fromEvents<T>(target, eventType, transform),

  /**
   * Create from observable
   */
  observable: <T extends BubbleChartData = BubbleChartData>(observable: Observable<T[]>) =>
    DataSourceFactory.fromObservable<T>(observable),

  /**
   * Auto-detect and create
   */
  auto: <T extends BubbleChartData = BubbleChartData>(input: any) =>
    DataSourceFactory.autoDetect<T>(input)
}; 