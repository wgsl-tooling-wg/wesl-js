/** Shared time formatting function for all charts */
const timeFormattingCode = `
  const formatTimeAxis = d => {
    if (d < 0.001) return (d * 1000000).toFixed(0) + "ns";
    if (d < 0.01) return (d * 1000).toFixed(1) + "μs";
    if (d < 1) return d.toFixed(3) + "ms";
    if (d >= 10) return d.toFixed(0) + "ms";
    return d.toFixed(2) + "ms";
  };
`;

/** Generate Observable Plot code for histogram + KDE */
export function histogramKdePlotCode(): string {
  return `
    function createHistogramKde(allSamples, benchmarkNames) {
      ${timeFormattingCode.trim()}
      
      // Calculate better bin thresholds based on data range
      const values = allSamples.map(d => d.value);
      const min = d3.min(values);
      const max = d3.max(values);
      const q1 = d3.quantile(values.sort((a, b) => a - b), 0.25);
      const q3 = d3.quantile(values, 0.75);
      const iqr = q3 - q1;
      
      // Focus on the main data range, excluding extreme outliers
      const binMin = Math.max(min, q1 - 1.5 * iqr);
      const binMax = Math.min(max, q3 + 1.5 * iqr);
      
      return Plot.plot({
        marginLeft: 70,
        marginRight: 110,
        marginBottom: 60,
        width: 550,
        height: 300,
        style: { fontSize: "14px" },
        x: { 
          label: "Time (ms)", 
          domain: [binMin, binMax], 
          labelOffset: 45,
          tickFormat: d => d.toFixed(1)
        },
        y: { label: "Count", labelAnchor: "center", grid: true, labelOffset: 50 },
        color: { 
          legend: false, 
          domain: benchmarkNames,
          scheme: "observable10"
        },
        marks: [
          Plot.rectY(
            allSamples,
            Plot.binX(
              { y: "count" },
              { 
                x: "value", 
                fill: "benchmark",
                fillOpacity: 0.6,
                thresholds: d3.ticks(binMin, binMax, 25),
                inset: 1
              }
            )
          ),
          Plot.ruleY([0]),
          
          // Custom legend inside chart (upper right) - legend rectangles
          ...benchmarkNames.map((name, i) => {
            const color = d3.schemeObservable10[i % d3.schemeObservable10.length];
            const legendY = 15 - i * 2.5; // Static positioning from top
            const legendX = binMax * 0.7;
            
            return Plot.rect([{x1: legendX, x2: legendX + (binMax - binMin) * 0.08, y1: legendY, y2: legendY + 1.5}], {
              x1: "x1", x2: "x2", y1: "y1", y2: "y2",
              fill: color, fillOpacity: 0.6
            });
          }),
          // Custom legend inside chart (upper right) - legend text
          ...benchmarkNames.map((name, i) => {
            const legendY = 15.75 - i * 2.5; // Centered with rectangles  
            const legendX = binMax * 0.7 + (binMax - binMin) * 0.12;
            
            return Plot.text([{x: legendX, y: legendY, text: name}], {
              x: "x", y: "y", text: "text", fontSize: 11, textAnchor: "start", fill: "#333"
            });
          })
        ]
      });
    }`;
}

/** Generate sample time series showing each sample in order */
export function sampleTimeSeriesCode(): string {
  return `
    function createSampleTimeSeries(timeSeries) {
      // Show actual time for each sample in the order they were collected
      const sampleData = [];
      const benchmarks = [...new Set(timeSeries.map(d => d.benchmark))];
      
      // Keep values in original milliseconds and determine best unit
      benchmarks.forEach(benchmark => {
        const benchData = timeSeries.filter(d => d.benchmark === benchmark);
        const isBaseline = benchmark.includes("(baseline)");
        
        benchData.forEach((d, i) => {
          sampleData.push({
            benchmark: benchmark,
            sample: i,
            value: d.value, // Keep in milliseconds
            isBaseline: isBaseline
          });
        });
      });
      
      // Determine appropriate time unit and conversion
      const allValues = sampleData.map(d => d.value);
      const minVal = d3.min(allValues);
      const maxVal = d3.max(allValues);
      const avgVal = d3.mean(allValues);
      
      let timeUnit, unitSuffix, convertValue, formatValue;
      
      if (avgVal < 0.001) {
        // Nanoseconds
        timeUnit = "ns";
        unitSuffix = "ns";
        convertValue = (ms) => ms * 1000000;
        formatValue = d => d3.format(",.0f")(d);
      } else if (avgVal < 1) {
        // Microseconds
        timeUnit = "μs";
        unitSuffix = "μs"; 
        convertValue = (ms) => ms * 1000;
        formatValue = d => d3.format(",.1f")(d);
      } else {
        // Milliseconds
        timeUnit = "ms";
        unitSuffix = "ms";
        convertValue = (ms) => ms;
        formatValue = d => d3.format(",.1f")(d);
      }
      
      // Convert values for display
      const convertedData = sampleData.map(d => ({
        ...d,
        displayValue: convertValue(d.value)
      }));
      
      // Smart Y-axis range - don't start at 0
      const convertedValues = convertedData.map(d => d.displayValue);
      const dataMin = d3.min(convertedValues);
      const dataMax = d3.max(convertedValues);
      const dataRange = dataMax - dataMin;
      
      // Start Y-axis at ~10-20% below minimum value, but with nice round numbers
      const padding = Math.max(dataRange * 0.15, dataRange * 0.1);
      let yMin = dataMin - padding;
      
      // Round down to a nice number
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(yMin))));
      yMin = Math.floor(yMin / magnitude) * magnitude;
      
      // Ensure we don't go below 0 for positive data
      if (dataMin > 0 && yMin < 0) {
        yMin = 0;
      }
      
      const yMax = dataMax + (dataRange * 0.05);
      
      return Plot.plot({
        marginLeft: 70,
        marginBottom: 60,
        marginRight: 110,
        width: 550,
        height: 300,
        style: { fontSize: "14px" },
        x: { 
          label: "Sample", 
          labelAnchor: "center",
          labelOffset: 45,
          grid: true,
          domain: [0, d3.max(convertedData, d => d.sample)]
        },
        y: { 
          label: null,
          grid: true,
          domain: [yMin, yMax],
          tickFormat: formatValue
        },
        color: { 
          legend: false,
          scheme: "observable10"
        },
        marks: [
          // Baseline samples (hollow yellow circles)
          Plot.dot(
            convertedData.filter(d => d.isBaseline),
            { 
              x: "sample", 
              y: "displayValue", 
              stroke: "#ffa500",
              fill: "none",
              strokeWidth: 2,
              r: 3,
              opacity: 0.8,
              title: d => \`Sample \${d.sample}: \${formatValue(d.displayValue)}\${unitSuffix}\`
            }
          ),
          // Non-baseline samples (filled blue circles)
          Plot.dot(
            convertedData.filter(d => !d.isBaseline),
            { 
              x: "sample", 
              y: "displayValue", 
              fill: "#4682b4",
              r: 3,
              opacity: 0.8,
              title: d => \`Sample \${d.sample}: \${formatValue(d.displayValue)}\${unitSuffix}\`
            }
          ),
          // Bottom baseline (black line at the bottom of the domain)
          Plot.ruleY([yMin], { stroke: "black", strokeWidth: 1 }),
          // Y-axis label at the top - positioned well above the chart
          Plot.text([{ x: d3.max(convertedData, d => d.sample) * -0.05, y: yMax * 1.08, text: \`Time (ms)\` }], {
            x: "x", 
            y: "y", 
            text: "text", 
            fontSize: 12,
            textAnchor: "middle",
            fill: "#333"
          }),
          
          // Legend background box
          Plot.rect([{
            x1: d3.max(convertedData, d => d.sample) * 0.65, 
            x2: d3.max(convertedData, d => d.sample) * 1.05,
            y1: yMax * 0.75,
            y2: yMax * 1.05
          }], {
            x1: "x1", x2: "x2", y1: "y1", y2: "y2",
            fill: "white", fillOpacity: 0.9, stroke: "#ddd", strokeWidth: 1
          }),
          
          // Custom legend - sort so main benchmark is first, baseline second
          ...benchmarks.sort((a, b) => {
            const aBaseline = a.includes("(baseline)");
            const bBaseline = b.includes("(baseline)");
            if (!aBaseline && bBaseline) return -1;
            if (aBaseline && !bBaseline) return 1;
            return 0;
          }).map((benchmark, i) => {
            const isBaseline = benchmark.includes("(baseline)");
            const color = isBaseline ? "#ffa500" : "#4682b4"; // Orange for baseline, blue for main
            const legendY = yMax * 0.95 - i * (yMax * 0.08);
            const legendX = d3.max(convertedData, d => d.sample) * 0.68;
            
            return isBaseline 
              ? Plot.dot([{x: legendX, y: legendY}], {
                  x: "x", y: "y", stroke: color, fill: "none", strokeWidth: 2, r: 4
                })
              : Plot.dot([{x: legendX, y: legendY}], {
                  x: "x", y: "y", fill: color, r: 4
                });
          }),
          // Custom legend text - closer to symbols
          ...benchmarks.sort((a, b) => {
            const aBaseline = a.includes("(baseline)");
            const bBaseline = b.includes("(baseline)");
            if (!aBaseline && bBaseline) return -1;
            if (aBaseline && !bBaseline) return 1;
            return 0;
          }).map((benchmark, i) => {
            const legendY = yMax * 0.95 - i * (yMax * 0.08);
            const legendX = d3.max(convertedData, d => d.sample) * 0.72;
            
            return Plot.text([{x: legendX, y: legendY, text: benchmark}], {
              x: "x", y: "y", text: "text", fontSize: 12, textAnchor: "start", fill: "#333"
            });
          })
        ]
      });
    }`;
}

/** Generate Q-Q plot for normality testing */
export function qqPlotCode(): string {
  return `
    function createQQPlot(qqData, benchmarkName) {
      const minVal = Math.min(...qqData.map(d => Math.min(d.theoretical, d.sample)));
      const maxVal = Math.max(...qqData.map(d => Math.max(d.theoretical, d.sample)));
      
      // Smart formatting for Q-Q plot axes - use milliseconds
      const formatQQ = d => {
        if (Math.abs(d) < 0.1) return d.toFixed(3);
        if (Math.abs(d) < 10) return d.toFixed(2);
        return d.toFixed(1);
      };
      
      return Plot.plot({
        marginLeft: 80,
        marginBottom: 60,
        marginRight: 50,
        width: 400,
        height: 400,
        aspectRatio: 1,
        style: { fontSize: "14px" },
        x: { 
          label: "Theoretical Quantiles (ms)", 
          domain: [minVal, maxVal], 
          labelOffset: 45,
          tickFormat: formatQQ
        },
        y: { 
          label: "Sample Quantiles (ms)", 
          labelAnchor: "center", 
          domain: [minVal, maxVal], 
          labelOffset: 60,
          tickFormat: formatQQ
        },
        marks: [
          Plot.line(
            [[minVal, minVal], [maxVal, maxVal]],
            { stroke: "gray", strokeDasharray: "4,2" }
          ),
          Plot.dot(
            qqData,
            { 
              x: "theoretical", 
              y: "sample",
              fill: "steelblue",
              title: d => \`Sample: \${formatQQ(d.sample)}\`
            }
          ),
          Plot.text(
            [{ x: maxVal * 0.85, y: maxVal * 0.15, text: benchmarkName }],
            { x: "x", y: "y", text: "text", fontSize: 12 }
          )
        ]
      });
    }`;
}
