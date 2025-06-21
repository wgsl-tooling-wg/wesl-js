# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Type checking**: `pnpm typecheck` or `tsgo`
- **Run benchmarks**: `pnpm bench` or `tsx bin/bench.ts`
- **Run with profiling**: `pnpm tsx --inspect-brk bin/bench.ts --profile` then attach Chrome DevTools
- **Run with detailed performance**: `sudo tsx --expose-gc --allow-natives-syntax bin/bench.ts`

## Architecture

This is a benchmarking tool for comparing performance of different WGSL/WESL parsers and linkers:

- **Parser variants tested**: 
  - `wgsl-linker` (WESL parser)
  - `wesl-link` (WESL linker) 
  - `wgsl_reflect` (Rust-based WGSL reflection)
  - `use-gpu` (WebGPU shader linker)

- **Test files**: Located in `src/examples/` with various WGSL shader examples including Bevy engine shaders and Unity WebGPU shaders

- **Main benchmark runner**: `bin/bench.ts` - orchestrates loading test files, running parser variants, and collecting performance metrics using the Mitata benchmarking library

- **Performance metrics collected**: execution time, memory usage (heap), garbage collection stats, and custom counters via `@mitata/counters`

- **Workspace dependencies**: Uses `wesl` package from the parent workspace for WESL parsing functionality

The benchmarking setup loads WGSL shader files, runs them through different parsing/linking implementations, and measures performance characteristics to compare parser efficiency.