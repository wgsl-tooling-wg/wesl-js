import { createRunner } from "./BaseRunner.ts";
import { createMeasureOptions } from "./RunnerUtils.ts";

/** Standard runner using mitata benchmarking */
export const standardRunner = createRunner(
  "standard",
  async (spec, options) => {
    const { mitataBench } = await import("../mitata-util/MitataBench.ts");
    const measureOptions = createMeasureOptions(options);
    return mitataBench(() => spec.fn(spec.params), spec.name, measureOptions);
  },
);
