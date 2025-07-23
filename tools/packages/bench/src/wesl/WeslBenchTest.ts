import type { BenchmarkSpec, BenchTest } from "../Benchmark.ts";
import {
  createVariantFunction,
  type ParserVariant,
} from "./BenchVariations.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

export interface WeslParams {
  weslSrc: Record<string, string>;
  rootModuleName: string;
}

class WeslBenchTestAdapter implements BenchTest<WeslParams> {
  name: string;
  private test: WeslBenchTest;
  private variants: ParserVariant[];
  private useBaseline: boolean;

  constructor(
    test: WeslBenchTest,
    variants: ParserVariant[],
    useBaseline = false,
  ) {
    this.name = test.name;
    this.test = test;
    this.variants = variants;
    this.useBaseline = useBaseline;
  }

  setup(): WeslParams {
    return {
      weslSrc: Object.fromEntries(this.test.files.entries()),
      rootModuleName: this.test.mainFile,
    };
  }

  async getBenchmarks(): Promise<BenchmarkSpec<WeslParams>[]> {
    const benchmarks: BenchmarkSpec<WeslParams>[] = [];

    for (const variant of this.variants) {
      const { current, baseline } = await createVariantFunction(
        variant,
        this.useBaseline,
      );

      const spec: BenchmarkSpec<WeslParams> = {
        name: `${variant}:${this.test.name}`,
        fn: current,
        params: this.setup(),
      };

      if (baseline && this.useBaseline) {
        spec.baseline = {
          fn: baseline,
        };
      }

      benchmarks.push(spec);
    }

    return benchmarks;
  }

  get benchmarks(): BenchmarkSpec<WeslParams>[] {
    // For synchronous access, we'll need to handle this differently
    // This is a placeholder that throws to enforce async usage
    throw new Error(
      "WeslBenchTestAdapter.benchmarks requires async access. Use getBenchmarks() instead.",
    );
  }
}

/**
 * Adapter to convert WeslBenchTest to BenchTest
 */
export async function createWeslBenchTest(
  test: WeslBenchTest,
  variants: ParserVariant[],
  useBaseline = false,
): Promise<BenchTest<WeslParams>> {
  const weslTest = new WeslBenchTestAdapter(test, variants, useBaseline);
  const benchmarks = await weslTest.getBenchmarks();

  return {
    name: weslTest.name,
    setup: () => weslTest.setup(),
    benchmarks,
    metadata: {
      weslBenchTest: test,
    },
  };
}
