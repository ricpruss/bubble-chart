/**
 * Lightweight Observable Implementation
 * Framework-agnostic reactive data streams for bubble chart library
 */

export type ObserverFunction<T> = (value: T) => void;
export type UnsubscribeFunction = () => void;
export type TransformFunction<T, U> = (value: T) => U;

/**
 * Simple observable interface compatible with various reactive libraries
 */
export interface Observable<T> {
  subscribe(observer: ObserverFunction<T>): UnsubscribeFunction;
  map?<U>(transform: TransformFunction<T, U>): Observable<U>;
  filter?(predicate: (value: T) => boolean): Observable<T>;
}

/**
 * Core observable implementation with subscription management
 */
export class SimpleObservable<T> implements Observable<T> {
  private subscribers: Set<ObserverFunction<T>> = new Set();
  private _currentValue!: T; // Using definite assignment assertion
  private _hasValue = false;

  constructor(initialValue?: T) {
    if (initialValue !== undefined) {
      this._currentValue = initialValue;
      this._hasValue = true;
    }
  }

  /**
   * Subscribe to value changes
   * @param observer - Function called when value changes
   * @returns Unsubscribe function
   */
  subscribe(observer: ObserverFunction<T>): UnsubscribeFunction {
    this.subscribers.add(observer);
    
    // Emit current value immediately if available
    if (this._hasValue) {
      observer(this._currentValue);
    }
    
    return () => this.subscribers.delete(observer);
  }

  /**
   * Emit new value to all subscribers
   * @param value - New value to emit
   */
  next(value: T): void {
    this._currentValue = value;
    this._hasValue = true;
    this.subscribers.forEach(observer => {
      try {
        observer(value);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }

  /**
   * Get current value without subscribing
   * @returns Current value or undefined if no value set
   */
  get current(): T | undefined {
    return this._hasValue ? this._currentValue : undefined;
  }

  /**
   * Check if observable has a current value
   */
  get hasValue(): boolean {
    return this._hasValue;
  }

  /**
   * Transform values with a mapping function
   * @param transform - Function to transform values
   * @returns New observable with transformed values
   */
  map<U>(transform: TransformFunction<T, U>): SimpleObservable<U> {
    const mapped = new SimpleObservable<U>();
    
    this.subscribe(value => {
      try {
        mapped.next(transform(value));
      } catch (error) {
        console.error('Transform error:', error);
      }
    });
    
    return mapped;
  }

  /**
   * Filter values based on predicate
   * @param predicate - Function to test values
   * @returns New observable with filtered values
   */
  filter(predicate: (value: T) => boolean): SimpleObservable<T> {
    const filtered = new SimpleObservable<T>();
    
    this.subscribe(value => {
      try {
        if (predicate(value)) {
          filtered.next(value);
        }
      } catch (error) {
        console.error('Filter error:', error);
      }
    });
    
    return filtered;
  }

  /**
   * Combine with another observable
   * @param other - Other observable to combine with
   * @returns New observable with combined values as tuples
   */
  combineWith<U>(other: Observable<U>): SimpleObservable<[T, U]> {
    const combined = new SimpleObservable<[T, U]>();
    let latestThis: T | undefined;
    let latestOther: U | undefined;
    let hasThis = false;
    let hasOther = false;

    const emit = () => {
      if (hasThis && hasOther) {
        combined.next([latestThis!, latestOther!]);
      }
    };

    this.subscribe(value => {
      latestThis = value;
      hasThis = true;
      emit();
    });

    other.subscribe(value => {
      latestOther = value;
      hasOther = true;
      emit();
    });

    return combined;
  }

  /**
   * Dispose of all subscriptions
   */
  dispose(): void {
    this.subscribers.clear();
    this._hasValue = false;
  }
}

/**
 * Observable adapter for external libraries (RxJS, etc.)
 */
export class ObservableAdapter<T> implements Observable<T> {
  constructor(private source: any) {}

  subscribe(observer: ObserverFunction<T>): UnsubscribeFunction {
    // Handle RxJS-style observables
    if (this.source && typeof this.source.subscribe === 'function') {
      const subscription = this.source.subscribe({
        next: observer,
        error: (error: any) => console.error('Observable error:', error),
        complete: () => {} // Handle completion if needed
      });
      
      return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      };
    }
    
    throw new Error('Unsupported observable type');
  }
}

/**
 * Create observable from a Promise
 * @param promise - Promise that resolves to a value
 * @returns Observable that emits the resolved value
 */
export function fromPromise<T>(promise: Promise<T>): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  promise
    .then(value => observable.next(value))
    .catch(error => {
      console.error('Promise observable error:', error);
      // Could emit error event here if we had error handling
    });
  
  return observable;
}

/**
 * Create observable from an async function
 * @param asyncFn - Async function that returns a value
 * @returns Observable that emits the resolved value
 */
export function fromAsyncFunction<T>(asyncFn: () => Promise<T>): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  asyncFn()
    .then(value => observable.next(value))
    .catch(error => {
      console.error('Async function observable error:', error);
      // Could emit error event here if we had error handling
    });
  
  return observable;
}

/**
 * Create observable from fetch request
 * @param input - Fetch input (URL or Request object)
 * @param init - Fetch options
 * @returns Observable that emits the parsed JSON response
 */
export function fromFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  fetch(input, init)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => observable.next(data))
    .catch(error => {
      console.error('Fetch observable error:', error);
      // Could emit error event here if we had error handling
    });
  
  return observable;
}

/**
 * Create observable that retries failed promises
 * @param promiseFactory - Function that creates a promise
 * @param maxRetries - Maximum number of retry attempts
 * @param retryDelay - Delay between retries in milliseconds
 * @returns Observable with retry logic
 */
export function fromPromiseWithRetry<T>(
  promiseFactory: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  const attempt = (retryCount = 0): void => {
    promiseFactory()
      .then(value => observable.next(value))
      .catch(error => {
        if (retryCount < maxRetries) {
          console.warn(`Promise failed, retrying (${retryCount + 1}/${maxRetries})...`, error);
          setTimeout(() => attempt(retryCount + 1), retryDelay);
        } else {
          console.error(`Promise failed after ${maxRetries} retries:`, error);
          // Could emit error event here
        }
      });
  };
  
  attempt();
  return observable;
}

/**
 * Create observable from multiple async data sources with fallback
 * @param sources - Array of promise factories to try in order
 * @returns Observable that emits from the first successful source
 */
export function fromMultipleSources<T>(
  sources: (() => Promise<T>)[]
): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  const trySource = (index: number): void => {
    if (index >= sources.length) {
      console.error('All data sources failed');
      return;
    }
    
    const sourceFactory = sources[index];
    if (sourceFactory) {
      sourceFactory()
        .then(value => observable.next(value))
        .catch(error => {
          console.warn(`Data source ${index} failed, trying next...`, error);
          trySource(index + 1);
        });
    } else {
      trySource(index + 1);
    }
  };
  
  trySource(0);
  return observable;
}

/**
 * Enhanced factory function that handles various async patterns
 */
export function createObservable<T>(source: any): Observable<T> {
  // Already an observable
  if (source && typeof source.subscribe === 'function') {
    // Check if it's our SimpleObservable
    if (source instanceof SimpleObservable) {
      return source;
    }
    // Wrap external observables
    return new ObservableAdapter<T>(source);
  }

  // Promise
  if (source && typeof source.then === 'function') {
    return fromPromise<T>(source);
  }

  // Function (sync or async)
  if (typeof source === 'function') {
    try {
      const result = (source as () => any)();
      if (result && typeof result.then === 'function') {
        return fromPromise<T>(result);
      }
      // Synchronous function result
      return new SimpleObservable<T>(result);
    } catch (error) {
      console.error('Function observable error:', error);
      return new SimpleObservable<T>();
    }
  }

  // Array or static value
  if (Array.isArray(source) || source !== null && source !== undefined) {
    return new SimpleObservable<T>(source);
  }

  // Handle null/undefined by creating empty observable
  if (source === null || source === undefined) {
    return new SimpleObservable<T>();
  }

  throw new Error('Unable to create observable from source');
}

/**
 * Utility to check if a value is promise-like
 */
export function isPromiseLike(obj: any): obj is Promise<any> {
  return obj && typeof obj.then === 'function';
}

/**
 * Utility to check if a value is an async function
 */
export function isAsyncFunction(fn: any): boolean {
  return typeof fn === 'function' && fn.constructor && fn.constructor.name === 'AsyncFunction';
}

/**
 * Utility function to check if something is observable-like
 */
export function isObservable(obj: any): obj is Observable<any> {
  return Boolean(obj && typeof obj.subscribe === 'function');
}

/**
 * Create observable from DOM events
 */
export function fromEvent<T = Event>(
  target: EventTarget,
  eventType: string,
  transform?: (event: Event) => T
): SimpleObservable<T> {
  const observable = new SimpleObservable<T>();
  
  const handler = (event: Event) => {
    const value = transform ? transform(event) : (event as unknown as T);
    observable.next(value);
  };
  
  target.addEventListener(eventType, handler);
  
  // Store cleanup function
  (observable as any)._cleanup = () => {
    target.removeEventListener(eventType, handler);
  };
  
  return observable;
}

/**
 * Create observable from timer/interval
 */
export function interval(ms: number): SimpleObservable<number> {
  const observable = new SimpleObservable<number>();
  let count = 0;
  
  const intervalId = setInterval(() => {
    observable.next(count++);
  }, ms);
  
  // Store cleanup function
  (observable as any)._cleanup = () => {
    clearInterval(intervalId);
  };
  
  return observable;
} 