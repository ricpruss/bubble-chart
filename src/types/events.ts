/**
 * Event system types for Bubble Chart library
 * Provides type-safe event handling with D3.js integration
 */

import type { BubbleChartData } from './data.js';

/**
 * Supported event types in the bubble chart library
 */
export type BubbleEventType = 
  | 'click'
  | 'mouseover' 
  | 'mouseout'
  | 'mouseenter'
  | 'mouseleave'
  | 'timechange'
  | 'datachange'
  | 'render'
  | 'destroy';

/**
 * Event handler function signature for data-related events
 */
export type DataEventHandler<T = BubbleChartData> = (
  data: T,
  event: MouseEvent,
  element: SVGElement
) => void;

/**
 * Event handler function signature for time-based events
 */
export type TimeEventHandler = (
  year: number,
  month?: number,
  event?: Event
) => void;

/**
 * Event handler function signature for lifecycle events
 */
export type LifecycleEventHandler = (chart: unknown) => void;

/**
 * Generic event handler type that covers all possible handlers
 */
export type EventHandler<T = BubbleChartData> = 
  | DataEventHandler<T>
  | TimeEventHandler
  | LifecycleEventHandler;

/**
 * Complete event handler registry for a bubble chart instance
 */
export interface BubbleEventHandlers<T = BubbleChartData> {
  /** Bubble click event */
  click?: DataEventHandler<T>;
  /** Mouse over bubble event */
  mouseover?: DataEventHandler<T>;
  /** Mouse out of bubble event */
  mouseout?: DataEventHandler<T>;
  /** Mouse enter bubble event */
  mouseenter?: DataEventHandler<T>;
  /** Mouse leave bubble event */
  mouseleave?: DataEventHandler<T>;
  /** Time/timeline change event (for temporal charts) */
  timechange?: TimeEventHandler;
  /** Data update event */
  datachange?: LifecycleEventHandler;
  /** Chart render completion event */
  render?: LifecycleEventHandler;
  /** Chart destruction event */
  destroy?: LifecycleEventHandler;
}

/**
 * Event data payload for custom events
 */
export interface BubbleEventPayload<T = BubbleChartData> {
  /** Event type */
  type: BubbleEventType;
  /** Data associated with the event */
  data?: T;
  /** Original browser event */
  originalEvent?: Event;
  /** Target SVG element */
  target?: SVGElement;
  /** Chart instance that triggered the event */
  chart?: unknown;
  /** Additional event-specific data */
  [key: string]: unknown;
}

/**
 * D3.js specific event handler signatures
 * These match D3's event handling patterns exactly
 */
export interface D3EventHandlers<T = BubbleChartData> {
  /** D3.js style click handler */
  click?: (event: MouseEvent, d: T) => void;
  /** D3.js style mouseover handler */
  mouseover?: (event: MouseEvent, d: T) => void;
  /** D3.js style mouseout handler */
  mouseout?: (event: MouseEvent, d: T) => void;
  /** D3.js style mouseenter handler */
  mouseenter?: (event: MouseEvent, d: T) => void;
  /** D3.js style mouseleave handler */
  mouseleave?: (event: MouseEvent, d: T) => void;
}

/**
 * Event listener registration options
 */
export interface EventOptions {
  /** Whether to capture the event */
  capture?: boolean;
  /** Whether the event should be triggered only once */
  once?: boolean;
  /** Whether the event listener is passive */
  passive?: boolean;
}

/**
 * Event management interface for bubble chart instances
 */
export interface EventManager<T = BubbleChartData> {
  /** Register an event handler */
  on(event: BubbleEventType, handler: EventHandler<T>, options?: EventOptions): void;
  
  /** Remove an event handler */
  off(event: BubbleEventType, handler?: EventHandler<T>): void;
  
  /** Trigger an event */
  emit(event: BubbleEventType, payload?: BubbleEventPayload<T>): void;
  
  /** Check if an event has listeners */
  hasListeners(event: BubbleEventType): boolean;
  
  /** Get all listeners for an event */
  getListeners(event: BubbleEventType): EventHandler<T>[];
  
  /** Remove all event listeners */
  removeAllListeners(): void;
}

/**
 * Custom event class for bubble chart events
 */
export class BubbleEvent<T = BubbleChartData> extends CustomEvent<BubbleEventPayload<T>> {
  constructor(type: BubbleEventType, payload?: BubbleEventPayload<T>) {
    const eventPayload: BubbleEventPayload<T> = payload ?? { type };
    super(type, {
      detail: eventPayload,
      bubbles: true,
      cancelable: true
    });
  }
}

/**
 * Event utility functions
 */

/**
 * Creates a type-safe event handler wrapper for D3.js
 */
export function createD3EventHandler<T = BubbleChartData>(
  handler: DataEventHandler<T>
): (event: MouseEvent, d: T) => void {
  return (event: MouseEvent, d: T) => {
    const target = event.target as SVGElement;
    handler(d, event, target);
  };
}

/**
 * Validates event type
 */
export function isValidEventType(event: string): event is BubbleEventType {
  const validEvents: BubbleEventType[] = [
    'click', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
    'timechange', 'datachange', 'render', 'destroy'
  ];
  return validEvents.includes(event as BubbleEventType);
}

/**
 * Creates event payload with proper typing
 */
export function createEventPayload<T = BubbleChartData>(
  type: BubbleEventType,
  data?: T,
  originalEvent?: Event,
  additionalData?: Record<string, unknown>
): BubbleEventPayload<T> {
  const payload: BubbleEventPayload<T> = { type };
  
  if (data !== undefined) {
    payload.data = data;
  }
  
  if (originalEvent !== undefined) {
    payload.originalEvent = originalEvent;
    if (originalEvent.target) {
      payload.target = originalEvent.target as SVGElement;
    }
  }
  
  if (additionalData) {
    Object.assign(payload, additionalData);
  }
  
  return payload;
}

/**
 * Debounced event handler wrapper
 */
export function debounceEventHandler<T extends unknown[]>(
  handler: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: number | undefined;
  
  return (...args: T) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      handler(...args);
    }, delay);
  };
}

/**
 * Throttled event handler wrapper
 */
export function throttleEventHandler<T extends unknown[]>(
  handler: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let lastCall = 0;
  
  return (...args: T) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      handler(...args);
    }
  };
} 