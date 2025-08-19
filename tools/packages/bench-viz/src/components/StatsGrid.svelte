<script lang="ts">
import type { BenchmarkResult } from "bencher/json";
import StatCard from "./StatCard.svelte";

interface Props {
  benchmark: BenchmarkResult;
  title?: string;
}

const { benchmark, title }: Props = $props();

function formatTime(ms: number): string {
  if (ms < 0.001) return `${(ms * 1000000).toFixed(2)} ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`;
  return `${ms.toFixed(2)} ms`;
}
</script>

<div class="stats-container">
  {#if title}
    <h3 class="stats-title">{title}</h3>
  {/if}
  <div class="stats-grid">
    <StatCard label="Min" value={formatTime(benchmark.time.min)} />
    <StatCard label="Median" value={formatTime(benchmark.time.p50)} />
    <StatCard label="Mean" value={formatTime(benchmark.time.mean)} />
    <StatCard label="Max" value={formatTime(benchmark.time.max)} />
    <StatCard label="P75" value={formatTime(benchmark.time.p75)} />
    <StatCard label="P99" value={formatTime(benchmark.time.p99)} />
  </div>
</div>

<style>
  .stats-container {
    margin: 24px 0;
  }
  
  .stats-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: #333;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
</style>