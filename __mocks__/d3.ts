// Minimal Jest manual mock for the 'd3' module
// Provides only the APIs used in unit tests to avoid pulling in ESM build

// Helper to create a chainable stub selection
function createSelection() {
  const chain: any = {
    append: jest.fn(() => chain),
    attr: jest.fn(() => chain),
    style: jest.fn(() => chain),
    select: jest.fn(() => chain),
    selectAll: jest.fn(() => chain),
    each: jest.fn(() => chain),
    empty: jest.fn(() => false),
    interrupt: jest.fn(() => chain),
    remove: jest.fn(() => chain)
  };
  return chain;
}

const mockedTimer = jest.fn((callback?: (elapsed: number) => void) => {
  // Call the callback immediately for synchronous tests, if provided
  if (callback) {
    callback(0);
  }
  return {
    stop: jest.fn()
  };
});

const d3Mock: any = {
  timer: mockedTimer,
  range: (start: number, stop: number, step: number) => {
    const result: number[] = [];
    for (let x = start; x < stop; x += step) {
      result.push(x);
    }
    return result;
  },
  select: jest.fn(() => createSelection()),
  // Provide aliases commonly used in the source
  selectAll: jest.fn(() => createSelection())
};

export default d3Mock;

// Also export named functions so that "import * as d3" picks them up
export const timer = d3Mock.timer;
export const range = d3Mock.range;
export const select = d3Mock.select;
export const selectAll = d3Mock.selectAll; 