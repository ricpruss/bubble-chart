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
 * Factory function to create observables from various sources
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
  
  // Create from static value
  if (source !== undefined) {
    return new SimpleObservable<T>(source);
  }
  
  // Create empty observable
  return new SimpleObservable<T>();
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