import * as mitata from "mitata";
import { mitataStats } from "../mitata-util/MitataStats.ts";
import { createRunner } from "./BaseRunner.ts";

/** Vanilla mitata runner for direct mitata measurements */
export const vanillaMitataRunner = createRunner(
  "vanilla-mitata",
  async spec => {
    const result = await mitata.measure(() => spec.fn(spec.params));
    return mitataStats(result, spec.name, undefined);
  },
);
