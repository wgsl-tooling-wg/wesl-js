<script lang="ts">
  interface Props {
    title?: string;
    generatedAt?: string;
    nodeVersion?: string;
    platform?: string;
  }

  const {
    title = "Benchmarks",
    nodeVersion = "N/A",
    platform = "N/A",
  }: Props = $props();
</script>

<header class="header">
  <h1 class="title">{title}</h1>
  <div class="metadata">
    <span class="metadata-item">Node: {nodeVersion}</span>
    <span class="metadata-item">Platform: {platform}</span>
  </div>
</header>

<style>
  .header {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #333;
  }

  .metadata {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: #666;
  }

  .metadata-item {
    display: inline-block;
  }
</style>
