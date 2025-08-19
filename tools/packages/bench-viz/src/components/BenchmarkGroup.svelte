<script lang="ts">
  import type { BenchmarkGroup as BenchmarkGroupType } from "bencher/json";
  import type { QQPoint } from "../data/VizTypes";
  import { calculateQQData } from "../stats/StatisticalUtils.ts";
  import HistogramChart from "./HistogramChart.svelte";
  import QQPlotGrid from "./QQPlotGrid.svelte";
  import StatsGrid from "./StatsGrid.svelte";
  import TimeSeriesChart from "./TimeSeriesChart.svelte";

  interface Props {
    group: BenchmarkGroupType;
  }

  const { group }: Props = $props();

  function prepareQQPlots(
    group: BenchmarkGroupType,
  ): Array<{ name: string; data: QQPoint[] }> {
    const plots: Array<{ name: string; data: QQPoint[] }> = [];

    // Only include regular benchmarks, not baseline
    group.benchmarks.forEach(benchmark => {
      if (benchmark.samples && benchmark.samples.length >= 3) {
        plots.push({
          name: benchmark.name,
          data: calculateQQData(benchmark.samples),
        });
      }
    });

    return plots;
  }

  const qqPlots = $derived(prepareQQPlots(group));
</script>

<div class="benchmark-group">
  <h2 class="group-title">{group.name}</h2>

  <div class="chart-grid">
    <TimeSeriesChart {group} />
    <HistogramChart {group} />
    <QQPlotGrid {qqPlots} />
  </div>

  <!-- {#if group.baseline}
    <div class="stats-section">
      <StatsGrid benchmark={group.baseline} title="Baseline: {group.baseline.name}" />
    </div>
  {/if} -->

  <!-- {#each group.benchmarks as benchmark}
    <div class="stats-section">
      <StatsGrid {benchmark} title={benchmark.name} />
    </div>
  {/each} -->

</div>

<style>
  .benchmark-group {
    margin-bottom: 48px;
  }

  .group-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 24px 0;
    color: #333;
    padding-bottom: 12px;
    border-bottom: 2px solid #e9ecef;
  }

  /* .stats-section {
    margin-bottom: 20px;
  } */

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 1024px) {
    .chart-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
