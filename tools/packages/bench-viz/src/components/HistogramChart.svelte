<script lang="ts">
  import { renderHistogramChart } from "../chart/Histogram.ts";
  import type { BenchmarkGroup } from "bencher/json";

  interface Props {
    group: BenchmarkGroup;
  }

  const { group }: Props = $props();
  let chartContainer: HTMLElement;

  $effect(() => {
    if (chartContainer && group) {
      renderHistogramChart(chartContainer, group);
    }
  });
</script>

<div class="chart-wrapper">
  <div class="chart-header">
    <h3 class="chart-title">Distribution Histogram</h3>
    <p class="chart-description">Frequency distribution of execution times</p>
  </div>
  <div bind:this={chartContainer} class="chart-container"></div>
</div>

<style>
  .chart-wrapper {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .chart-header {
    margin-bottom: 16px;
  }

  .chart-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #333;
  }

  .chart-description {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
</style>
