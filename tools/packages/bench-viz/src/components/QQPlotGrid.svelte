<script lang="ts">
import type { QQPoint } from "../data/VizTypes";
import QQPlot from "./QQPlot.svelte";

interface Props {
  qqPlots: Array<{ name: string; data: QQPoint[] }>;
}

const { qqPlots }: Props = $props();
</script>

{#if qqPlots.length > 0}
  <div class="qqplot-section">
    <h3 class="section-title">Q-Q Plots</h3>
    <p class="section-description">
      Quantile-quantile plots for normality assessment
    </p>
    <div class="qqplot-grid">
      {#each qqPlots as plot}
        <QQPlot data={plot.data} benchmarkName={plot.name} />
      {/each}
    </div>
  </div>
{/if}

<style>
  .qqplot-section {
    margin: 32px 0;
  }
  
  .section-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #333;
  }
  
  .section-description {
    font-size: 14px;
    color: #666;
    margin: 0 0 20px 0;
  }
  
  .qqplot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }
  
  @media (max-width: 768px) {
    .qqplot-grid {
      grid-template-columns: 1fr;
    }
  }
</style>