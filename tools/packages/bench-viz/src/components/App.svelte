<script lang="ts">
  import BenchmarkGroup from "./BenchmarkGroup.svelte";
  import Header from "./Header.svelte";
  import { onMount } from "svelte";
  import { loadData, type LoadedData } from "./LoadBenchmarkData.svelte.ts";

  const loaded = $state<LoadedData>({ loading: true, data: null });

  onMount(() => {
    loadData(loaded);
  });
</script>

<div class="app">
  {#if loaded.data}
    <Header
      title="WESL benchmarks"
      generatedAt={loaded.data.meta.timestamp}
      nodeVersion={loaded.data.meta.environment.node}
      platform={`${loaded.data.meta.environment.platform} ${loaded.data.meta.environment.arch ?? ""}`}
    />
  {/if}

  {#if loaded.data?.suites?.length}
    <div class="content">
      {#each loaded.data.suites as suite}
        <div class="suite">
          <h1 class="suite-title">{suite.name}</h1>
          {#each suite.groups as group}
            <BenchmarkGroup {group} />
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="error">No benchmark data available</div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, sans-serif;
    background: #f5f7fa;
    color: #333;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }

  .content {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .suite {
    margin-bottom: 48px;
  }

  .suite-title {
    font-size: 28px;
    font-weight: 700;
    margin: 32px 0 24px 0;
    color: #2c3e50;
  }

  .error {
    text-align: center;
    color: #e74c3c;
    padding: 40px;
    font-size: 18px;
  }
</style>
