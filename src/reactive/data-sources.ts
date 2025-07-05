/**
 * Data Source Abstractions
 * Unified interface for different data input methods with enhanced error handling
 */

import type { BubbleChartData } from '../types/data.js';
import { SimpleObservable, type Observable } from './observable.js';

/**
 * Error types for data sources
 */
export type DataSourceErrorType = 
  | 'connection_failed'
  | 'data_parse_error'
  | 'network_error'
  | 'timeout_error'
  | 'authentication_error'
  | 'rate_limit_error'
  | 'unknown_error';

/**
 * Data source error with context
 */
export interface DataSourceError {
  type: DataSourceErrorType;
  message: string;
  originalError?: any;
  timestamp: Date;
  source: string;
  retryable: boolean;
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
  retryableErrors: DataSourceErrorType[];
}

/**
 * Default error recovery configuration
 */
export const defaultErrorRecovery: ErrorRecoveryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  retryableErrors: ['connection_failed', 'network_error', 'timeout_error']
};

/**
 * Configuration for different data source types
 */
export interface DataSourceConfig<T = BubbleChartData> {
  // Static data
  static?: {
    data: T[];
    allowUpdates?: boolean;
  };
  
  // WebSocket data
  websocket?: {
    url: string;
    protocols?: string[];
    transform?: (message: any) => T[];
    reconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
    errorRecovery?: Partial<ErrorRecoveryConfig>;
  };
  
  // Polling data
  polling?: {
    url: string;
    interval: number;
    transform?: (response: any) => T[];
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
    timeout?: number;
    errorRecovery?: Partial<ErrorRecoveryConfig>;
  };
  
  // Event-driven data
  events?: {
    target: EventTarget;
    eventType: string;
    transform?: (event: Event) => T[];
    errorRecovery?: Partial<ErrorRecoveryConfig>;
  };
  
  // External observable
  observable?: Observable<T[]>;
}

/**
 * Base interface for all data sources with enhanced error handling
 */
export interface DataSource<T = BubbleChartData> {
  /** Observable stream of data */
  readonly stream: Observable<T[]>;
  
  /** Observable stream of errors */
  readonly errorStream: Observable<DataSourceError>;
  
  /** Observable stream of connection state changes */
  readonly statusStream: Observable<DataSourceStatus>;
  
  /** Start the data source */
  start(): void;
  
  /** Stop the data source */
  stop(): void;
  
  /** Check if source is currently active */
  readonly isActive: boolean;
  
  /** Get current connection status */
  readonly status: DataSourceStatus;
  
  /** Clean up resources */
  dispose(): void;
  
  /** Manually trigger retry */
  retry(): void;
}

/**
 * Data source connection status
 */
export type DataSourceStatus = 
  | 'idle' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'reconnecting' 
  | 'disconnected';

/**
 * Abstract base class for data sources with error handling
 */
export abstract class BaseDataSource<T = BubbleChartData> implements DataSource<T> {
  protected _status: DataSourceStatus = 'idle';
  protected _isActive = false;
  protected statusObservable = new SimpleObservable<DataSourceStatus>('idle');
  protected errorObservable = new SimpleObservable<DataSourceError>();
  protected retryCount = 0;
  protected retryTimeoutId: number | null = null;
  protected errorRecovery: ErrorRecoveryConfig;

  constructor(errorRecovery?: Partial<ErrorRecoveryConfig>) {
    this.errorRecovery = { ...defaultErrorRecovery, ...errorRecovery };
  }

  abstract readonly stream: Observable<T[]>;

  get errorStream(): Observable<DataSourceError> {
    return this.errorObservable;
  }

  get statusStream(): Observable<DataSourceStatus> {
    return this.statusObservable;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get status(): DataSourceStatus {
    return this._status;
  }

  abstract start(): void;
  abstract stop(): void;
  abstract dispose(): void;
  abstract retry(): void;

  protected setStatus(status: DataSourceStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.statusObservable.next(status);
    }
  }

  protected emitError(
    type: DataSourceErrorType,
    message: string,
    originalError?: any,
    source = 'unknown'
  ): void {
    const error: DataSourceError = {
      type,
      message,
      originalError,
      timestamp: new Date(),
      source,
      retryable: this.errorRecovery.retryableErrors.includes(type)
    };

    this.errorObservable.next(error);

    // Auto-retry if error is retryable and we haven't exceeded max retries
    if (error.retryable && this.retryCount < this.errorRecovery.maxRetries) {
      this.scheduleRetry();
    } else if (this.retryCount >= this.errorRecovery.maxRetries) {
      console.error(`Max retries (${this.errorRecovery.maxRetries}) exceeded for ${source}`);
      this.setStatus('error');
    }
  }

  protected scheduleRetry(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    const delay = this.errorRecovery.retryDelay * 
      Math.pow(this.errorRecovery.backoffFactor, this.retryCount);

    this.retryCount++;
    this.setStatus('reconnecting');

    this.retryTimeoutId = window.setTimeout(() => {
      this.retry();
    }, delay);
  }

  protected clearRetryTimeout(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  protected resetRetryCount(): void {
    this.retryCount = 0;
    this.clearRetryTimeout();
  }
}

/**
 * Static data source for arrays and manual updates
 */
export class StaticDataSource<T = BubbleChartData> extends BaseDataSource<T> {
  private observable: SimpleObservable<T[]>;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['static']>) {
    super();
    this.observable = new SimpleObservable<T[]>(config.data);
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  start(): void {
    this._isActive = true;
    this.setStatus('connected');
    // Emit initial data
    this.observable.next(this.config.data);
  }
  
  stop(): void {
    this._isActive = false;
    this.setStatus('disconnected');
  }
  
  /**
   * Update the static data (if allowed)
   */
  updateData(newData: T[]): void {
    if (!this.config.allowUpdates) {
      this.emitError('data_parse_error', 'StaticDataSource: Updates not allowed', undefined, 'static');
      return;
    }
    
    this.config.data = newData;
    if (this._isActive) {
      this.observable.next(newData);
    }
  }
  
  dispose(): void {
    this.stop();
    this.observable.dispose();
  }
  
  retry(): void {
    if (!this._isActive) {
      this.start();
    }
  }
}

/**
 * WebSocket data source for real-time streaming
 */
export class WebSocketDataSource<T = BubbleChartData> extends BaseDataSource<T> {
  private observable: SimpleObservable<T[]>;
  private websocket: WebSocket | null = null;
  private reconnectTimeoutId: number | null = null;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['websocket']>) {
    super(config.errorRecovery);
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  override get isActive(): boolean {
    return this._isActive && this.websocket?.readyState === WebSocket.OPEN;
  }
  
  start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.setStatus('connecting');
    this.connect();
  }
  
  stop(): void {
    this._isActive = false;
    this.setStatus('disconnected');
    this.disconnect();
  }
  
  private connect(): void {
    try {
      this.websocket = new WebSocket(this.config.url, this.config.protocols);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected:', this.config.url);
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const transformedData = this.config.transform 
            ? this.config.transform(rawData)
            : rawData;
          
          if (Array.isArray(transformedData)) {
            this.observable.next(transformedData);
          }
        } catch (error) {
          console.error('WebSocket message processing error:', error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket closed');
        if (this._isActive && this.config.reconnect) {
          this.scheduleReconnect();
        }
      };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }
  
  private disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
  
  private scheduleReconnect(): void {
    const delay = this.config.reconnectDelay || 5000;
    this.reconnectTimeoutId = window.setTimeout(() => {
      if (this._isActive) {
        console.log('Attempting WebSocket reconnection...');
        this.connect();
      }
    }, delay);
  }
  
  dispose(): void {
    this.stop();
    this.observable.dispose();
  }
  
  retry(): void {
    // Implementation needed
  }
}

/**
 * Polling data source for HTTP endpoints
 */
export class PollingDataSource<T = BubbleChartData> extends BaseDataSource<T> {
  private observable: SimpleObservable<T[]>;
  private intervalId: number | null = null;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['polling']>) {
    super(config.errorRecovery);
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
    override get isActive(): boolean {
    return this._isActive;
  }

  override start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.setStatus('connecting');
    this.startPolling();
  }

  override stop(): void {
    this._isActive = false;
    this.setStatus('disconnected');
    this.stopPolling();
  }
  
  private startPolling(): void {
    // Fetch immediately
    this.fetchData();
    
    // Set up interval
    this.intervalId = window.setInterval(() => {
      if (this._isActive) {
        this.fetchData();
      }
    }, this.config.interval);
  }
  
  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async fetchData(): Promise<void> {
    try {
      const response = await fetch(this.config.url, {
        method: this.config.method || 'GET',
        headers: this.config.headers || {}
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      const transformedData = this.config.transform 
        ? this.config.transform(rawData)
        : rawData;
      
      if (Array.isArray(transformedData)) {
        this.observable.next(transformedData);
      }
      
    } catch (error) {
      console.error('Polling fetch error:', error);
    }
  }
  
  override dispose(): void {
    this.stop();
    this.observable.dispose();
  }
  
  override retry(): void {
    if (this._isActive) {
      this.fetchData();
    }
  }
}

/**
 * Event-driven data source for DOM events
 */
export class EventDataSource<T = BubbleChartData> extends BaseDataSource<T> {
  private observable: SimpleObservable<T[]>;
  private eventHandler: ((event: Event) => void) | null = null;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['events']>) {
    super(config.errorRecovery);
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  override start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.setStatus('connecting');
    this.addEventListener();
  }
  
  override stop(): void {
    this._isActive = false;
    this.setStatus('disconnected');
    this.removeEventListener();
  }
  
  private addEventListener(): void {
    this.eventHandler = (event: Event) => {
      try {
        const transformedData = this.config.transform 
          ? this.config.transform(event)
          : [];
        
        if (Array.isArray(transformedData)) {
          this.observable.next(transformedData);
        }
      } catch (error) {
        console.error('Event processing error:', error);
      }
    };
    
    this.config.target.addEventListener(this.config.eventType, this.eventHandler);
  }
  
  private removeEventListener(): void {
    if (this.eventHandler) {
      this.config.target.removeEventListener(this.config.eventType, this.eventHandler);
      this.eventHandler = null;
    }
  }
  
  override dispose(): void {
    this.stop();
    this.observable.dispose();
  }
  
  override retry(): void {
    // Event sources don't need retry logic
  }
}

/**
 * Observable wrapper data source for external observables
 */
export class ObservableDataSource<T = BubbleChartData> extends BaseDataSource<T> {
  private unsubscribe: (() => void) | null = null;
  
  constructor(private observable: Observable<T[]>) {
    super();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  override start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.setStatus('connected');
    // Observable data sources are always "active" when subscribed to
  }
  
  override stop(): void {
    this._isActive = false;
    this.setStatus('disconnected');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
  
  override dispose(): void {
    this.stop();
  }
  
  override retry(): void {
    // Implementation needed
  }
} 