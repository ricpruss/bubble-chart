/**
 * Unit tests for DataStore (reactive API)
 */

import { DataStore } from '../store.js';

describe('DataStore', () => {
  interface Item {
    id: string;
    label: string;
    size: number;
    value: number;
    name: string;
    year: number;
    [key: string]: unknown;
  }

  it('initialises empty', () => {
    const store = new DataStore<Item>();
    expect(store.length()).toBe(0);
  });

  it('adds items and emits correct stats', () => {
    const store = new DataStore<Item>();

    const listener = jest.fn();
    store.on(listener);

    const stats = store.add({ id: 'a', label: 'A', size: 1, value: 1, name: 'A', year: 2020 });
    expect(stats.entered).toBe(1);
    expect(stats.total).toBe(1);
    expect(store.length()).toBe(1);
    expect(listener).toHaveBeenCalledWith(stats, store.data());
  });

  it('updates items and emits updated stats', () => {
    const store = new DataStore<Item>([{ id: 'a', label: 'A', size: 1, value: 1, name: 'A', year: 2020 }]);
    const listener = jest.fn();
    store.on(listener);

    const stats = store.update('a', { value: 2 });
    expect(stats.updated).toBe(1);
    expect(store.data()[0]!.value).toBe(2);
    expect(listener).toHaveBeenCalled();
  });

  it('removes items and emits exited stats', () => {
    const store = new DataStore<Item>([{ id: 'a', label: 'A', size: 1, value: 1, name: 'A', year: 2020 }]);
    const listener = jest.fn();
    store.on(listener);

    const stats = store.remove('a');
    expect(stats.exited).toBe(1);
    expect(store.length()).toBe(0);
    expect(listener).toHaveBeenCalled();
  });

  it('clears store', () => {
    const store = new DataStore<Item>([
      { id: 'a', label: 'A', size: 1, value: 1, name: 'A', year: 2020 },
      { id: 'b', label: 'B', size: 2, value: 2, name: 'B', year: 2021 },
    ]);
    const stats = store.clear();
    expect(stats.exited).toBe(2);
    expect(store.length()).toBe(0);
  });
}); 