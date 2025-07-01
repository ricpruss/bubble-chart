import { BubbleBuilder } from '../bubble-builder.js';
import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartConfig } from '../types/config.js';
import { DataStore, type KeyFunction } from './store.js';

export interface AnimationBlock {
  enter?: { duration: number; stagger?: number; easing?: string };
  update?: { duration: number; easing?: string };
  exit?: { duration: number; easing?: string };
}

export interface BubbleChartOptions<T extends BubbleChartData = BubbleChartData> extends Partial<BubbleChartConfig> {
  key?: KeyFunction<T>;
  animations?: AnimationBlock;
}

export type EventName = 'change' | 'render' | 'destroy';
export type EventHandler = (payload: any) => void;

export interface BubbleChart<T extends BubbleChartData = BubbleChartData> {
  readonly store: DataStore<T>;
  on(event: EventName, handler: EventHandler): this;
  off(event: EventName, handler: EventHandler): this;
  setAnimation(animation: Partial<AnimationBlock>): this;
  redraw(): this;
  destroy(): void;
}

class BubbleChartFacade<T extends BubbleChartData = BubbleChartData> implements BubbleChart<T> {
  public readonly store: DataStore<T>;
  private builder: BubbleBuilder<T>;
  private listeners: Map<EventName, Set<EventHandler>> = new Map();

  private animations: AnimationBlock | undefined;

  constructor(container: string, options: BubbleChartOptions<T>) {
    // Build chart config
    const { key, animations, ...configRest } = options;
    const config: BubbleChartConfig = {
      container,
      label: configRest.label ?? 'name',
      size: configRest.size ?? 'value',
      ...configRest
    } as unknown as BubbleChartConfig;

    this.animations = animations;

    this.builder = new BubbleBuilder<T>(config);
    this.store = new DataStore<T>([], key);

    // initial render if any data
    if (this.store.length()) {
      this.builder.data([...this.store.data()] as T[]).render();
    }

    this.store.on((stats) => {
      // update builder
      this.builder.data([...this.store.data()] as T[]).render();
      this.emit('change', stats);
      this.emit('render', undefined);
    });
  }

  on(event: EventName, handler: EventHandler): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return this;
  }

  off(event: EventName, handler: EventHandler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  setAnimation(animation: Partial<AnimationBlock>): this {
    this.animations = { ...this.animations, ...animation };
    // adapt builder config if needed
    if (animation.enter?.duration) {
      this.builder.setConfig({ animation: { speed: animation.enter.duration, method: 'no-recursive' } });
    }
    return this;
  }

  redraw(): this {
    this.builder.data([...this.store.data()] as T[]).render();
    return this;
  }

  destroy(): void {
    this.store.clear();
    this.builder.destroy();
    this.emit('destroy', undefined);
    this.listeners.clear();
  }

  private emit(event: EventName, payload: any): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export function createBubbleChart<T extends BubbleChartData = BubbleChartData>(
  container: string,
  options: BubbleChartOptions<T>
): BubbleChart<T> {
  return new BubbleChartFacade<T>(container, options);
} 