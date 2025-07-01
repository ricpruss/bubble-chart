/**
 * Data Source Abstractions
 * Unified interface for different data input methods
 */

import type { BubbleChartData } from '../types/data.js';
import { SimpleObservable, type Observable } from './observable.js';

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
  };
  
  // Polling data
  polling?: {
    url: string;
    interval: number;
    transform?: (response: any) => T[];
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
  };
  
  // Event-driven data
  events?: {
    target: EventTarget;
    eventType: string;
    transform?: (event: Event) => T[];
  };
  
  // External observable
  observable?: Observable<T[]>;
}

/**
 * Base interface for all data sources
 */
export interface DataSource<T = BubbleChartData> {
  /** Observable stream of data */
  readonly stream: Observable<T[]>;
  
  /** Start the data source */
  start(): void;
  
  /** Stop the data source */
  stop(): void;
  
  /** Check if source is currently active */
  readonly isActive: boolean;
  
  /** Clean up resources */
  dispose(): void;
}

/**
 * Static data source for arrays and manual updates
 */
export class StaticDataSource<T = BubbleChartData> implements DataSource<T> {
  private observable: SimpleObservable<T[]>;
  private _isActive = false;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['static']>) {
    this.observable = new SimpleObservable<T[]>(config.data);
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  get isActive(): boolean {
    return this._isActive;
  }
  
  start(): void {
    this._isActive = true;
    // Emit initial data
    this.observable.next(this.config.data);
  }
  
  stop(): void {
    this._isActive = false;
  }
  
  /**
   * Update the static data (if allowed)
   */
  updateData(newData: T[]): void {
    if (!this.config.allowUpdates) {
      console.warn('StaticDataSource: Updates not allowed');
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
}

/**
 * WebSocket data source for real-time streaming
 */
export class WebSocketDataSource<T = BubbleChartData> implements DataSource<T> {
  private observable: SimpleObservable<T[]>;
  private websocket: WebSocket | null = null;
  private _isActive = false;
  private reconnectTimeoutId: number | null = null;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['websocket']>) {
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  get isActive(): boolean {
    return this._isActive && this.websocket?.readyState === WebSocket.OPEN;
  }
  
  start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.connect();
  }
  
  stop(): void {
    this._isActive = false;
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
}

/**
 * Polling data source for HTTP endpoints
 */
export class PollingDataSource<T = BubbleChartData> implements DataSource<T> {
  private observable: SimpleObservable<T[]>;
  private intervalId: number | null = null;
  private _isActive = false;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['polling']>) {
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  get isActive(): boolean {
    return this._isActive;
  }
  
  start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.startPolling();
  }
  
  stop(): void {
    this._isActive = false;
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
  
  dispose(): void {
    this.stop();
    this.observable.dispose();
  }
}

/**
 * Event-driven data source for DOM events
 */
export class EventDataSource<T = BubbleChartData> implements DataSource<T> {
  private observable: SimpleObservable<T[]>;
  private _isActive = false;
  private eventHandler: ((event: Event) => void) | null = null;
  
  constructor(private config: NonNullable<DataSourceConfig<T>['events']>) {
    this.observable = new SimpleObservable<T[]>();
  }
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  get isActive(): boolean {
    return this._isActive;
  }
  
  start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    this.addEventListener();
  }
  
  stop(): void {
    this._isActive = false;
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
  
  dispose(): void {
    this.stop();
    this.observable.dispose();
  }
}

/**
 * Observable wrapper data source for external observables
 */
export class ObservableDataSource<T = BubbleChartData> implements DataSource<T> {
  private _isActive = false;
  private unsubscribe: (() => void) | null = null;
  
  constructor(private observable: Observable<T[]>) {}
  
  get stream(): Observable<T[]> {
    return this.observable;
  }
  
  get isActive(): boolean {
    return this._isActive;
  }
  
  start(): void {
    if (this._isActive) return;
    
    this._isActive = true;
    // Observable data sources are always "active" when subscribed to
  }
  
  stop(): void {
    this._isActive = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
  
  dispose(): void {
    this.stop();
  }
} 