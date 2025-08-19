<script lang="ts">
  import { renderTimeSeriesChart } from "../chart/TimeSeries.ts";
  import type { BenchmarkGroup } from "bencher/json";

  interface Props {
    group: BenchmarkGroup;
  }

  const { group }: Props = $props();
  let chartContainer: HTMLElement;

  $effect(() => {
    if (chartContainer && group) {
      renderTimeSeriesChart(chartContainer, group);
    }
  });
</script>

<div class="chart-wrapper">
  <div class="chart-header">
    <h3 class="chart-title">Sample Time Series</h3>
    <p class="chart-description">
      Execution time for each sample in collection order
    </p>
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

  .chart-container {
    width: 100%;
    min-height: 400px;
  }
</style>
