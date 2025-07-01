// DataStore implementation for the new reactive API
// Lightweight observable array with diff emission

import type { BubbleChartData } from '../types/data.js';

export interface ChangeStats {
  entered: number;
  updated: number;
  exited: number;
  total: number;
}

export type KeyFunction<T> = (item: T, index?: number) => string | number;

export type ChangeListener<T> = (stats: ChangeStats, data: readonly T[]) => void;

/**
 * Generic DataStore holding chart data and emitting diffs
 */
export class DataStore<T extends BubbleChartData = BubbleChartData> {
  private items: Map<string | number, T>;
  private listeners: Set<ChangeListener<T>> = new Set();
  private keyFn: KeyFunction<T>;

  constructor(initial: T[] = [], keyFn?: KeyFunction<T>) {
    // default key function tries id -> name -> index
    this.keyFn = keyFn ?? ((d: any, i?: number) => (
      d.id ?? d.name ?? i ?? Math.random()
    ));

    // initialise map
    this.items = new Map();
    initial.forEach((d, i) => {
      const k = this.keyFn(d, i);
      this.items.set(k, d);
    });
  }

  /** Add a single item */
  add(item: T): ChangeStats {
    return this.addMany([item]);
  }

  /** Add multiple items */
  addMany(items: T[]): ChangeStats {
    let entered = 0;
    items.forEach((d, idx) => {
      const key = this.keyFn(d, idx);
      if (!this.items.has(key)) entered++;
      this.items.set(key, d);
    });
    const stats = this.stats({ entered });
    this.emit(stats);
    return stats;
  }

  /** Update an item by key or predicate */
  update(identifier: string | number | ((d: T) => boolean), patch: Partial<T>): ChangeStats {
    let updated = 0;
    [...this.items.entries()].forEach(([k, v]) => {
      const match = typeof identifier === 'function' ? identifier(v) : k === identifier;
      if (match) {
        this.items.set(k, { ...v, ...patch });
        updated++;
      }
    });
    const stats = this.stats({ updated });
    if (updated) this.emit(stats);
    return stats;
  }

  /** Remove by key or predicate */
  remove(identifier: string | number | ((d: T) => boolean)): ChangeStats {
    let exited = 0;
    [...this.items.entries()].forEach(([k, v]) => {
      const match = typeof identifier === 'function' ? identifier(v) : k === identifier;
      if (match) {
        this.items.delete(k);
        exited++;
      }
    });
    const stats = this.stats({ exited });
    if (exited) this.emit(stats);
    return stats;
  }

  /** Clear all */
  clear(): ChangeStats {
    const exited = this.items.size;
    this.items.clear();
    const stats = this.stats({ exited });
    this.emit(stats);
    return stats;
  }

  /** Number of items */
  length(): number {
    return this.items.size;
  }

  /** Immutable copy of data */
  data(): readonly T[] {
    return [...this.items.values()];
  }

  /** Keys snapshot */
  keys(): readonly (string | number)[] {
    return [...this.items.keys()];
  }

  /** Event management */
  on(listener: ChangeListener<T>): void {
    this.listeners.add(listener);
  }

  off(listener: ChangeListener<T>): void {
    this.listeners.delete(listener);
  }

  private emit(stats: ChangeStats): void {
    for (const l of this.listeners) l(stats, this.data());
  }

  private stats(partial: Partial<ChangeStats>): ChangeStats {
    return {
      entered: 0,
      updated: 0,
      exited: 0,
      total: this.items.size,
      ...partial,
    } as ChangeStats;
  }
} 