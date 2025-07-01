/**
 * Data Source Factory
 * Unified creation and management of different data source types
 */

import type { BubbleChartData } from '../types/data.js';
import type { Observable } from './observable.js';
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
 * Factory class for creating data sources
 */
export class DataSourceFactory {
  /**
   * Create a data source from configuration
   * @param config - Data source configuration
   * @returns Appropriate data source instance
   */
  static create<T extends BubbleChartData = BubbleChartData>(
    config: DataSourceConfig<T>
  ): DataSource<T> {
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

    // Create appropriate source
    if (config.static) {
      return new StaticDataSource<T>(config.static);
    }

    if (config.websocket) {
      this.validateWebSocketConfig(config.websocket);
      return new WebSocketDataSource<T>(config.websocket);
    }

    if (config.polling) {
      this.validatePollingConfig(config.polling);
      return new PollingDataSource<T>(config.polling);
    }

    if (config.events) {
      this.validateEventConfig(config.events);
      return new EventDataSource<T>(config.events);
    }

    if (config.observable) {
      this.validateObservableConfig(config.observable);
      return new ObservableDataSource<T>(config.observable);
    }

    throw new Error('Invalid data source configuration');
  }

  /**
   * Create data source from static data
   * @param data - Static data array
   * @param allowUpdates - Whether to allow manual updates
   * @returns Static data source
   */
  static fromStatic<T extends BubbleChartData = BubbleChartData>(
    data: T[],
    allowUpdates = false
  ): StaticDataSource<T> {
    return new StaticDataSource<T>({ data, allowUpdates });
  }

  /**
   * Create data source from WebSocket URL
   * @param url - WebSocket URL
   * @param options - Additional WebSocket options
   * @returns WebSocket data source
   */
  static fromWebSocket<T extends BubbleChartData = BubbleChartData>(
    url: string,
    options: Partial<NonNullable<DataSourceConfig<T>['websocket']>> = {}
  ): WebSocketDataSource<T> {
    return new WebSocketDataSource<T>({ url, ...options });
  }

  /**
   * Create data source from polling endpoint
   * @param url - HTTP endpoint URL
   * @param interval - Polling interval in milliseconds
   * @param options - Additional polling options
   * @returns Polling data source
   */
  static fromPolling<T extends BubbleChartData = BubbleChartData>(
    url: string,
    interval: number,
    options: Partial<NonNullable<DataSourceConfig<T>['polling']>> = {}
  ): PollingDataSource<T> {
    return new PollingDataSource<T>({ url, interval, ...options });
  }

  /**
   * Create data source from DOM events
   * @param target - Event target
   * @param eventType - Event type to listen for
   * @param transform - Function to transform events to data
   * @returns Event data source
   */
  static fromEvents<T extends BubbleChartData = BubbleChartData>(
    target: EventTarget,
    eventType: string,
    transform?: (event: Event) => T[]
  ): EventDataSource<T> {
    const config = { target, eventType } as any;
    if (transform) {
      config.transform = transform;
    }
    return new EventDataSource<T>(config);
  }

  /**
   * Create data source from observable
   * @param observable - Observable to wrap
   * @returns Observable data source
   */
  static fromObservable<T extends BubbleChartData = BubbleChartData>(
    observable: Observable<T[]>
  ): ObservableDataSource<T> {
    return new ObservableDataSource<T>(observable);
  }

  /**
   * Auto-detect data source type from input
   * @param input - Various input types
   * @returns Appropriate data source
   */
  static autoDetect<T extends BubbleChartData = BubbleChartData>(
    input: any
  ): DataSource<T> {
    // Array data
    if (Array.isArray(input)) {
      return this.fromStatic<T>(input, true);
    }

    // Observable-like object
    if (input && typeof input.subscribe === 'function') {
      return this.fromObservable<T>(input);
    }

    // URL string (assume polling)
    if (typeof input === 'string') {
      if (input.startsWith('ws://') || input.startsWith('wss://')) {
        return this.fromWebSocket<T>(input);
      }
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return this.fromPolling<T>(input, 5000); // Default 5s interval
      }
    }

    // Configuration object
    if (typeof input === 'object' && input !== null) {
      return this.create<T>(input);
    }

    throw new Error('Unable to auto-detect data source type from input');
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
    DataSourceFactory.fromStatic<T>(data, allowUpdates),

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