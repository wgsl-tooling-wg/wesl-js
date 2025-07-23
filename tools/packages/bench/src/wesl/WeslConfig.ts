import { type BenchConfig, createBaseConfig } from "../BenchConfig.ts";
import type { ParserVariant } from "./BenchVariations.ts";
import type { CliArgs } from "./CliArgs.ts";

/** WESL-specific configuration extension */
export interface WeslConfigExtension {
  variants: ParserVariant[];
  testSource: "wesl" | "simple";
  simpleTestName?: string;
}

/** Create WESL-specific configuration from CLI arguments */
export function createWeslConfig(argv: CliArgs): BenchConfig {
  const baseConfig = createBaseConfig(argv);

  // Determine test source
  const testSource = argv.simple ? "simple" : "wesl";

  // Validate variants
  const variants = validateVariants((argv.variant as string[]) || []);

  const weslExtension: WeslConfigExtension = {
    variants,
    testSource,
    simpleTestName: argv.simple,
  };

  return {
    ...baseConfig,
    extension: weslExtension,
  };
}

/** Validate requested variants */
function validateVariants(variants: string[]): ParserVariant[] {
  const ALL_VARIANTS: ParserVariant[] = [
    "link",
    "parse",
    "tokenize",
    "wgsl_reflect",
  ];
  const DEFAULT_VARIANTS: ParserVariant[] = ["link"];

  const valid: ParserVariant[] = [];

  for (const variant of variants) {
    if (ALL_VARIANTS.includes(variant as ParserVariant)) {
      valid.push(variant as ParserVariant);
    } else {
      console.warn(`Unknown variant: ${variant}`);
    }
  }

  return valid.length > 0 ? valid : DEFAULT_VARIANTS;
}

/** Type guard to check if config has WESL extension */
export function isWeslConfig(
  config: BenchConfig,
): config is BenchConfig & { extension: WeslConfigExtension } {
  return (
    config.extension !== undefined &&
    config.extension !== null &&
    typeof config.extension === "object" &&
    "variants" in config.extension &&
    "testSource" in config.extension
  );
}

/** Get WESL extension from config */
export function getWeslExtension(config: BenchConfig): WeslConfigExtension {
  if (!isWeslConfig(config)) {
    throw new Error("Config does not have WESL extension");
  }
  return config.extension;
}
