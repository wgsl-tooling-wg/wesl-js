#!/usr/bin/env -S node --expose-gc
import { type BenchGroup, type BenchSuite, runBenchCLI } from "../src/index.ts";

const stringGroup: BenchGroup<void> = {
  name: "String Operations",
  benchmarks: [
    { name: "plus", fn: () => "a" + "b" },
    { name: "template", fn: () => `a${"b"}` },
  ],
};

const sortingGroup: BenchGroup<number[]> = {
  name: "Array Sorting (1000 numbers)",
  setup: () => Array.from({ length: 1000 }, () => Math.random()),
  baseline: { name: "native sort", fn: nativeSort },
  benchmarks: [
    { name: "quicksort", fn: quickSort },
    { name: "insertion sort", fn: insertionSort },
  ],
};

const suite: BenchSuite = {
  name: "Performance Tests",
  groups: [stringGroup, sortingGroup],
};

runBenchCLI(suite);


/** Immutable quicksort implementation */
function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

/** Immutable insertion sort implementation */
function insertionSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 1; i < result.length; i++) {
    const key = result[i];
    let j = i - 1;
    while (j >= 0 && result[j] > key) {
      result[j + 1] = result[j];
      j--;
    }
    result[j + 1] = key;
  }
  return result;
}

/** immmutable native sort */
function nativeSort(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}
