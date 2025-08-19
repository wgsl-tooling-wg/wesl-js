<script lang="ts">
interface Props {
  label: string;
  value: string;
}

const { label, value }: Props = $props();
</script>

<div class="stat-card">
  <div class="label">{label}</div>
  <div class="value">{value}</div>
</div>

<style>
  .stat-card {
    background: white;
    padding: 10px;
    border-radius: 4px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  
  .label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .value {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-top: 4px;
  }
</style>