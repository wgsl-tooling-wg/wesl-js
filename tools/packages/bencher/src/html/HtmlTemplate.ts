import type { ReportData } from "./HtmlReport.ts";
import {
  histogramKdePlotCode,
  qqPlotCode,
  sampleTimeSeriesCode,
} from "./PlotGenerators.ts";
import { detectOutliersJsCode, qqDataJsCode } from "./StatisticalUtils.ts";

/** Generate complete HTML document with embedded data and visualizations */
export function generateHtmlDocument(data: ReportData): string {
  const _hasBaseline = data.groups.some(g => g.baseline);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benchmark Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      background: white;
      padding: 10px 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { 
      display: none;
    }
    h2 {
      color: #555;
      margin: 30px 0 20px;
      font-size: 20px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .metadata { 
      color: #666; 
      font-size: 12px;
    }
    .comparison-mode { 
      background: #fff3cd;
      color: #856404;
      padding: 8px 12px; 
      border-radius: 4px;
      display: inline-block;
      margin-top: 10px;
      font-weight: 500;
    }
    .plot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .plot-grid.second-row {
      grid-template-columns: 1fr;
    }
    .plot-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .plot-container.full-width {
      grid-column: 1 / -1;
    }
    .plot-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .plot-description {
      font-size: 14px;
      color: #666;
      margin-bottom: 15px;
    }
    .plot-area {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }
    .summary-stats {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .stat-item {
      background: white;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-top: 4px;
    }
    .loading {
      color: #666;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }
    .error {
      color: #d32f2f;
      background: #ffebee;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
    }
  </style>
  <script type="module">
    import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
    
    // Make Plot and d3 globally available
    window.Plot = Plot;
    window.d3 = d3;
    
    // Embedded benchmark data
    const benchmarkData = ${JSON.stringify(data, null, 2)};
    
    // Statistical utility functions
    ${qqDataJsCode}
    
    ${detectOutliersJsCode}
    
    // Plot generation functions
    ${histogramKdePlotCode()}
    
    ${sampleTimeSeriesCode()}
    
    ${qqPlotCode()}
    
    // Render all plots
    function renderPlots() {
      const { groups } = benchmarkData;
      
      groups.forEach((group, groupIndex) => {
        try {
          // Prepare data for plots
          const benchmarks = [];
          
          if (group.baseline) {
            benchmarks.push({
              name: group.baseline.name + " (baseline)",
              samples: group.baseline.samples,
              stats: group.baseline.stats,
              isBaseline: true
            });
          }
          
          group.benchmarks.forEach(b => {
            benchmarks.push({
              name: b.name,
              samples: b.samples,
              stats: b.stats,
              isBaseline: false
            });
          });
          
          // Skip if no samples
          if (benchmarks.length === 0 || !benchmarks[0].samples || benchmarks[0].samples.length === 0) {
            document.querySelector(\`#group-\${groupIndex}\`).innerHTML = 
              '<div class="error">No sample data available for visualization</div>';
            return;
          }
          
          // Flatten samples for combined plots
          const allSamples = [];
          const timeSeries = [];
          let allOutliers = [];
          
          benchmarks.forEach(b => {
            if (!b.samples || b.samples.length === 0) return;
            
            b.samples.forEach((value, i) => {
              allSamples.push({
                benchmark: b.name,
                value: value,
                iteration: i
              });
              timeSeries.push({
                benchmark: b.name,
                iteration: i,
                value: value
              });
            });
            
            // Detect outliers for this benchmark
            const { outliers } = detectOutliers(b.samples);
            outliers.forEach(o => {
              allOutliers.push({
                ...o,
                benchmark: b.name
              });
            });
          });
          
          const benchmarkNames = benchmarks.map(b => b.name);
          
          // Create histogram + KDE
          const histogramContainer = document.querySelector(\`#histogram-\${groupIndex}\`);
          if (histogramContainer && allSamples.length > 0) {
            histogramContainer.innerHTML = ''; // Clear loading text
            const histPlot = createHistogramKde(allSamples, benchmarkNames);
            histogramContainer.appendChild(histPlot);
          }
          
          
          
          // Create sample time series
          const sampleTimeSeriesContainer = document.querySelector(\`#sample-timeseries-\${groupIndex}\`);
          if (sampleTimeSeriesContainer && timeSeries.length > 0) {
            sampleTimeSeriesContainer.innerHTML = ''; // Clear loading text
            const stsPlot = createSampleTimeSeries(timeSeries);
            sampleTimeSeriesContainer.appendChild(stsPlot);
          }
          
          // Create Q-Q plots for each non-baseline benchmark only
          benchmarks.filter(b => !b.isBaseline).forEach((b, i) => {
            if (!b.samples || b.samples.length < 3) return;
            
            const qqContainer = document.querySelector(\`#qq-\${groupIndex}-\${i}\`);
            if (qqContainer) {
              qqContainer.innerHTML = ''; // Clear loading text
              const qqData = calculateQQData(b.samples);
              const qqPlot = createQQPlot(qqData, b.name);
              qqContainer.appendChild(qqPlot);
            }
          });
          
          // Add summary statistics
          const statsContainer = document.querySelector(\`#stats-\${groupIndex}\`);
          if (statsContainer) {
            statsContainer.innerHTML = benchmarks.map(b => \`
              <div class="summary-stats">
                <h3 style="margin-bottom: 10px; color: #333;">\${b.name}</h3>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-label">Min</div>
                    <div class="stat-value">\${b.stats.min.toFixed(3)}ms</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Median</div>
                    <div class="stat-value">\${b.stats.p50.toFixed(3)}ms</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Mean</div>
                    <div class="stat-value">\${b.stats.avg.toFixed(3)}ms</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Max</div>
                    <div class="stat-value">\${b.stats.max.toFixed(3)}ms</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">P75</div>
                    <div class="stat-value">\${b.stats.p75.toFixed(3)}ms</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">P99</div>
                    <div class="stat-value">\${b.stats.p99.toFixed(3)}ms</div>
                  </div>
                </div>
              </div>
            \`).join('');
          }
          
        } catch (error) {
          console.error('Error rendering plots for group', groupIndex, error);
          document.querySelector(\`#group-\${groupIndex}\`).innerHTML = 
            '<div class="error">Error rendering visualizations: ' + error.message + '</div>';
        }
      });
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      try {
        renderPlots();
      } catch (error) {
        console.error('Failed to render plots:', error);
        document.body.innerHTML += '<div class="error">Failed to render visualizations: ' + error.message + '</div>';
      }
    });
  </script>
</head>
<body>
  <div class="header">
    <div class="metadata">Generated: ${new Date().toLocaleString()}</div>
  </div>
  
  ${data.groups
    .map(
      (group, i) => `
    <div id="group-${i}">
      ${
        group.benchmarks.length > 0
          ? `
        <h2>Benchmark Group ${i + 1}</h2>
        
        <div class="plot-grid">
          <div class="plot-container">
            <div class="plot-title">Sample Time Series</div>
            <div class="plot-description">Execution time for each sample in collection order</div>
            <div id="sample-timeseries-${i}" class="plot-area">
              <div class="loading">Loading sample time series...</div>
            </div>
          </div>
          
          <div class="plot-container">
            <div class="plot-title">Distribution Histogram</div>
            <div class="plot-description">Frequency distribution of execution times</div>
            <div id="histogram-${i}" class="plot-area">
              <div class="loading">Loading histogram...</div>
            </div>
          </div>
        </div>
        
        <div class="plot-grid">
          ${group.benchmarks
            .filter(b => !b.name.includes("(baseline)"))
            .map(
              (b, j) => `
            <div class="plot-container">
              <div class="plot-title">Q-Q Plot: ${b.name}</div>
              <div class="plot-description">Tests normality assumption (points should follow diagonal)</div>
              <div id="qq-${i}-${j}" class="plot-area">
                <div class="loading">Loading Q-Q plot...</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div id="stats-${i}"></div>
      `
          : '<div class="error">No benchmark data available for this group</div>'
      }
    </div>
  `,
    )
    .join("")}
</body>
</html>`;
}
