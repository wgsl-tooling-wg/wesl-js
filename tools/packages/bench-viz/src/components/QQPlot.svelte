<script lang="ts">
  import { renderQQPlotChart } from "../chart/QqPlot.ts";
  import type { QQPoint } from "../data/VizTypes";

  interface Props {
    data: QQPoint[];
    benchmarkName: string;
  }

  const { data, benchmarkName }: Props = $props();
  let chartContainer: HTMLElement;

  $effect(() => {
    if (chartContainer && data && data.length > 0) {
      renderQQPlotChart(chartContainer, data, benchmarkName);
    }
  });
</script>

<div class="qqplot-wrapper">
  <h4 class="qqplot-title">{benchmarkName}</h4>
  <div bind:this={chartContainer} class="qqplot-container"></div>
</div>

<style>
  .qqplot-wrapper {
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .qqplot-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333;
    text-align: center;
  }

  .qqplot-container {
    width: 100%;
    aspect-ratio: 1;
    min-height: 300px;
    max-width: 400px;
    margin: 0 auto;
  }
</style>
