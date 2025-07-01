/**
 * Unit tests for Observable implementation
 */

import { SimpleObservable, createObservable, isObservable, fromEvent, interval } from '../observable.js';

describe('SimpleObservable', () => {
  let observable: SimpleObservable<number>;

  beforeEach(() => {
    observable = new SimpleObservable<number>();
  });

  describe('subscription', () => {
    it('should call observer immediately with current value', () => {
      const initialValue = 42;
      const obs = new SimpleObservable<number>(initialValue);
      const observer = jest.fn();

      obs.subscribe(observer);

      expect(observer).toHaveBeenCalledWith(initialValue);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('should not call observer immediately if no initial value', () => {
      const observer = jest.fn();

      observable.subscribe(observer);

      expect(observer).not.toHaveBeenCalled();
    });

    it('should call observer when new value is emitted', () => {
      const observer = jest.fn();
      observable.subscribe(observer);

      observable.next(123);

      expect(observer).toHaveBeenCalledWith(123);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('should call multiple observers', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();
      
      observable.subscribe(observer1);
      observable.subscribe(observer2);

      observable.next(456);

      expect(observer1).toHaveBeenCalledWith(456);
      expect(observer2).toHaveBeenCalledWith(456);
    });

    it('should unsubscribe properly', () => {
      const observer = jest.fn();
      const unsubscribe = observable.subscribe(observer);

      observable.next(1);
      expect(observer).toHaveBeenCalledTimes(1);

      unsubscribe();
      observable.next(2);
      expect(observer).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('current value', () => {
    it('should return undefined when no value set', () => {
      expect(observable.current).toBeUndefined();
      expect(observable.hasValue).toBe(false);
    });

    it('should return current value after next()', () => {
      observable.next(789);
      
      expect(observable.current).toBe(789);
      expect(observable.hasValue).toBe(true);
    });

    it('should update current value', () => {
      observable.next(1);
      observable.next(2);
      
      expect(observable.current).toBe(2);
    });
  });

  describe('transformations', () => {
    it('should map values correctly', () => {
      const mapped = observable.map(x => x * 2);
      const observer = jest.fn();
      
      mapped.subscribe(observer);
      observable.next(5);

      expect(observer).toHaveBeenCalledWith(10);
    });

    it('should filter values correctly', () => {
      const filtered = observable.filter(x => x > 10);
      const observer = jest.fn();
      
      filtered.subscribe(observer);
      
      observable.next(5);  // Should not pass filter
      observable.next(15); // Should pass filter

      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer).toHaveBeenCalledWith(15);
    });

    it('should combine observables', () => {
      const other = new SimpleObservable<string>();
      const combined = observable.combineWith(other);
      const observer = jest.fn();
      
      combined.subscribe(observer);
      
      // Should not emit until both have values
      observable.next(1);
      expect(observer).not.toHaveBeenCalled();
      
      other.next('hello');
      expect(observer).toHaveBeenCalledWith([1, 'hello']);
      
      // Should emit when either updates
      observable.next(2);
      expect(observer).toHaveBeenCalledWith([2, 'hello']);
    });
  });

  describe('error handling', () => {
    it('should handle observer errors gracefully', () => {
      const goodObserver = jest.fn();
      const badObserver = jest.fn(() => { throw new Error('Observer error'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      observable.subscribe(goodObserver);
      observable.subscribe(badObserver);
      
      observable.next(123);
      
      expect(goodObserver).toHaveBeenCalledWith(123);
      expect(badObserver).toHaveBeenCalledWith(123);
      expect(consoleSpy).toHaveBeenCalledWith('Observer error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle transform errors gracefully', () => {
      const mapped = observable.map(() => { throw new Error('Transform error'); });
      const observer = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mapped.subscribe(observer);
      observable.next(123);
      
      expect(observer).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Transform error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should clear all subscribers', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();
      
      observable.subscribe(observer1);
      observable.subscribe(observer2);
      
      observable.dispose();
      observable.next(123);
      
      expect(observer1).not.toHaveBeenCalled();
      expect(observer2).not.toHaveBeenCalled();
    });

    it('should reset hasValue flag', () => {
      observable.next(123);
      expect(observable.hasValue).toBe(true);
      
      observable.dispose();
      expect(observable.hasValue).toBe(false);
    });
  });
});

describe('utility functions', () => {
  describe('createObservable', () => {
    it('should return SimpleObservable for SimpleObservable input', () => {
      const input = new SimpleObservable<number>(42);
      const result = createObservable(input);
      
      expect(result).toBe(input);
    });

    it('should create SimpleObservable from static value', () => {
      const result = createObservable(42) as SimpleObservable<number>;
      
      expect(result).toBeInstanceOf(SimpleObservable);
      expect(result.current).toBe(42);
    });

    it('should create empty observable for undefined', () => {
      const result = createObservable(undefined) as SimpleObservable<any>;
      
      expect(result).toBeInstanceOf(SimpleObservable);
      expect(result.hasValue).toBe(false);
    });
  });

  describe('isObservable', () => {
    it('should return true for SimpleObservable', () => {
      const obs = new SimpleObservable<number>();
      expect(isObservable(obs)).toBe(true);
    });

    it('should return true for object with subscribe method', () => {
      const obs = { subscribe: jest.fn() };
      expect(isObservable(obs)).toBe(true);
    });

    it('should return false for regular objects', () => {
      expect(isObservable({})).toBe(false);
      expect(isObservable(null)).toBe(false);
      expect(isObservable(undefined)).toBe(false);
      expect(isObservable(42)).toBe(false);
    });
  });

     describe('fromEvent', () => {
     let target: EventTarget;

     beforeEach(() => {
       target = new EventTarget();
     });

     it('should create observable from DOM events', () => {
       const observable = fromEvent(target, 'test');
       const observer = jest.fn();
       
       observable.subscribe(observer);
       
       const event = new Event('test');
       target.dispatchEvent(event);
       
       expect(observer).toHaveBeenCalledWith(event);
     });

     it('should transform events if transform function provided', () => {
       const transform = (event: Event) => event.type;
       const observable = fromEvent(target, 'test', transform);
       const observer = jest.fn();
       
       observable.subscribe(observer);
       
       target.dispatchEvent(new Event('test'));
       
       expect(observer).toHaveBeenCalledWith('test');
     });

     it('should clean up event listener', () => {
       const addSpy = jest.spyOn(target, 'addEventListener');
       const removeSpy = jest.spyOn(target, 'removeEventListener');
       
       const observable = fromEvent(target, 'test');
       
       // fromEvent sets up listener during construction
       expect(addSpy).toHaveBeenCalled();
       
       // Call cleanup function
       (observable as any)._cleanup();
       expect(removeSpy).toHaveBeenCalled();
     });
   });

  describe('interval', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should emit incremental values at intervals', () => {
      const observable = interval(1000);
      const observer = jest.fn();
      
      observable.subscribe(observer);
      
      expect(observer).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      expect(observer).toHaveBeenCalledWith(0);
      
      jest.advanceTimersByTime(1000);
      expect(observer).toHaveBeenCalledWith(1);
      
      jest.advanceTimersByTime(1000);
      expect(observer).toHaveBeenCalledWith(2);
    });

    it('should clean up interval', () => {
      const observable = interval(1000);
      const clearSpy = jest.spyOn(global, 'clearInterval');
      
      observable.subscribe(jest.fn());
      
      // Call cleanup function
      (observable as any)._cleanup();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
}); 