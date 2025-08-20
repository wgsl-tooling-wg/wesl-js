/** Tools for reading and verifying generated charts */

/** expose verification functions globally */
const debugCharts = true; 

if (debugCharts && typeof globalThis !== "undefined") {
  (globalThis as any).verifyChart = verifyChart;
  (globalThis as any).logChartVerification = logChartVerification;
  (globalThis as any).debugSVGStructure = debugSVGStructure;
  (globalThis as any).verifyHistogramCoverage = verifyHistogramCoverage;
  console.log(
    "🔧 Debug mode enabled: verifyChart, logChartVerification, debugSVGStructure, and verifyHistogramCoverage are available globally",
  );
}

export interface ChartVerification {
  markType: string;
  count: number;
  attributes: Record<string, any>[];
  colors: string[];
  positions: { x: number; y: number; width?: number; height?: number }[];
  summary: string;
}

export interface HistogramCoverage {
  hasLeftEdge: boolean;
  hasRightEdge: boolean;
  dataRange: [number, number];
  barRange: [number, number];
  missingCoverage: boolean;
  warnings: string[];
}

/** @return verification of visualization elements from chart container */
export function verifyChart(container: HTMLElement): ChartVerification {
  const svgMarks = querySVGMarks(container);
  const primaryMark = determinePrimaryMark(svgMarks);
  const attributes = extractAttributes(primaryMark.elements);
  const colors = extractUniqueColors(primaryMark.elements);
  const positions = extractPositions(primaryMark.elements, primaryMark.type);
  const summary = generateSummary(primaryMark.count, primaryMark.type, colors);

  return {
    markType: primaryMark.type,
    count: primaryMark.count,
    attributes,
    colors,
    positions,
    summary,
  };
}

/** @return verification with detailed console logging */
export function logChartVerification(
  container: HTMLElement,
  chartType = "chart",
): ChartVerification {
  const verification = verifyChart(container);

  if (debugCharts) {
    console.group(`📊 Chart Verification: ${chartType}`);
    console.log("Summary:", verification.summary);
    console.log("Mark Type:", verification.markType);
    console.log("Count:", verification.count);
    console.log("Colors:", verification.colors);

    if (verification.count > 0) {
      console.log("Sample positions:", verification.positions.slice(0, 3));
      console.log("Sample attributes:", verification.attributes.slice(0, 2));
    }

    logCommonIssues(verification);
    console.groupEnd();
  }

  return verification;
}

/** Debug SVG element hierarchy for rendering issues */
export function debugSVGStructure(container: HTMLElement): void {
  if (debugCharts) {
    console.group("🔍 SVG Structure Debug");

    const svgs = container.querySelectorAll("svg");
    console.log(`Found ${svgs.length} SVG elements`);

    svgs.forEach((svg, i) => {
      console.log(`SVG ${i}:`, {
        width: svg.getAttribute("width"),
        height: svg.getAttribute("height"),
        childCount: svg.children.length,
      });

      Array.from(svg.children).forEach((child, j) => {
        console.log(`  Child ${j}: ${child.tagName}`, {
          class: child.getAttribute("class"),
          fill: child.getAttribute("fill"),
          childCount: child.children.length,
        });
      });
    });

    console.groupEnd();
  }
}

/** @return coverage analysis of histogram bars vs expected range */
export function verifyHistogramCoverage(
  container: HTMLElement,
  expectedDataRange: [number, number],
): HistogramCoverage {
  const verification = verifyChart(container);

  if (verification.markType !== "rect" || verification.count === 0) {
    return createEmptyCoverage(
      expectedDataRange,
      "No histogram bars found to verify coverage",
    );
  }

  const barXPositions = extractBarPositions(verification.positions);

  if (barXPositions.length === 0) {
    return createEmptyCoverage(
      expectedDataRange,
      "No valid bar positions found",
    );
  }

  return calculateCoverage(barXPositions, expectedDataRange);
}

interface SVGMarks {
  rects: Element[];
  circles: Element[];
  paths: Element[];
}

interface PrimaryMark {
  type: string;
  count: number;
  elements: Element[];
}

/** @return all visualization marks excluding background rectangles */
function querySVGMarks(container: HTMLElement): SVGMarks {
  return {
    rects: Array.from(container.querySelectorAll("rect")).filter(
      r =>
        r.getAttribute("width") !== "100%" &&
        r.getAttribute("height") !== "100%",
    ),
    circles: Array.from(container.querySelectorAll("circle")),
    paths: Array.from(container.querySelectorAll("path[stroke]")),
  };
}

/** @return primary visualization element type */
function determinePrimaryMark(marks: SVGMarks): PrimaryMark {
  if (marks.rects.length > 0) {
    return { type: "rect", count: marks.rects.length, elements: marks.rects };
  }
  if (marks.circles.length > 0) {
    return {
      type: "circle",
      count: marks.circles.length,
      elements: marks.circles,
    };
  }
  if (marks.paths.length > 0) {
    return { type: "path", count: marks.paths.length, elements: marks.paths };
  }
  return { type: "none", count: 0, elements: [] };
}

/** @return all attributes from SVG elements */
function extractAttributes(elements: Element[]): Record<string, any>[] {
  return elements.map(el => {
    const attrs: Record<string, any> = {};
    for (const attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  });
}

/** @return unique fill colors from elements */
function extractUniqueColors(elements: Element[]): string[] {
  return elements
    .map(el => el.getAttribute("fill"))
    .filter((color): color is string => color !== null && color !== "none")
    .filter((color, index, arr) => arr.indexOf(color) === index);
}

/** @return position and size data based on element type */
function extractPositions(elements: Element[], markType: string) {
  return elements.map(el => {
    if (markType === "rect") {
      return {
        x: Number.parseFloat(el.getAttribute("x") || "0"),
        y: Number.parseFloat(el.getAttribute("y") || "0"),
        width: Number.parseFloat(el.getAttribute("width") || "0"),
        height: Number.parseFloat(el.getAttribute("height") || "0"),
      };
    }
    if (markType === "circle") {
      return {
        x: Number.parseFloat(el.getAttribute("cx") || "0"),
        y: Number.parseFloat(el.getAttribute("cy") || "0"),
      };
    }
    return { x: 0, y: 0 };
  });
}

/** @return human-readable summary of verification results */
function generateSummary(
  count: number,
  markType: string,
  colors: string[],
): string {
  let summary = `Found ${count} ${markType} marks`;
  if (colors.length > 0) {
    summary += ` with ${colors.length} unique colors: ${colors.join(", ")}`;
  }
  if (count === 0) {
    summary +=
      ". No chart marks detected - chart may not be rendering properly.";
  }
  return summary;
}

/** Log common chart rendering problems */
function logCommonIssues(verification: ChartVerification): void {
  if (verification.count === 0) {
    console.warn("⚠️  No marks found. Check:");
    console.warn("   1. Data is loaded correctly");
    console.warn("   2. Plot.binX/Plot.dot syntax is correct");
    console.warn("   3. No JavaScript errors in console");
  }

  if (verification.colors.length === 0 && verification.count > 0) {
    console.warn(
      "⚠️  Marks found but no colors detected. Check fill attribute.",
    );
  }
}

/** @return empty coverage result when no bars found */
function createEmptyCoverage(
  expectedDataRange: [number, number],
  warning: string,
): HistogramCoverage {
  return {
    hasLeftEdge: false,
    hasRightEdge: false,
    dataRange: expectedDataRange,
    barRange: [0, 0],
    missingCoverage: true,
    warnings: [warning],
  };
}

/** @return sorted x-positions of histogram bars */
function extractBarPositions(
  positions: ChartVerification["positions"],
): number[] {
  return positions
    .map(pos => pos.x)
    .filter(x => x > 0)
    .sort((a, b) => a - b);
}

/** @return coverage analysis with 10% tolerance */
function calculateCoverage(
  barXPositions: number[],
  expectedDataRange: [number, number],
): HistogramCoverage {
  const leftmostBar = barXPositions[0];
  const rightmostBar = barXPositions[barXPositions.length - 1];

  const tolerance = 0.1; // 10% tolerance
  const expectedSpan = expectedDataRange[1] - expectedDataRange[0];

  const hasLeftEdge =
    leftmostBar <= expectedDataRange[0] + expectedSpan * tolerance;
  const hasRightEdge =
    rightmostBar >= expectedDataRange[1] - expectedSpan * tolerance;

  const warnings: string[] = [];
  if (!hasLeftEdge) {
    warnings.push(
      `Missing coverage at left edge: leftmost bar at ${leftmostBar.toFixed(1)}, expected near ${expectedDataRange[0].toFixed(1)}`,
    );
  }
  if (!hasRightEdge) {
    warnings.push(
      `Missing coverage at right edge: rightmost bar at ${rightmostBar.toFixed(1)}, expected near ${expectedDataRange[1].toFixed(1)}`,
    );
  }

  return {
    hasLeftEdge,
    hasRightEdge,
    dataRange: expectedDataRange,
    barRange: [leftmostBar, rightmostBar],
    missingCoverage: !hasLeftEdge || !hasRightEdge,
    warnings,
  };
}
