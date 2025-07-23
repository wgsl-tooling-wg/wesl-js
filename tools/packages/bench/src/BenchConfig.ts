import type { RunnerType } from "./runners/RunnerFactory.ts";
import type { ParserVariant } from "./wesl/BenchVariations.ts";
import type { CliArgs } from "./wesl/CliArgs.ts";

/** Unified configuration for all benchmark operations */
export interface BenchConfig {
  // Test selection
  filter?: string;
  variants: ParserVariant[];
  testSource: 'wesl' | 'simple';
  simpleTestName?: string;
  
  // Execution mode
  mode: 'standard' | 'worker' | 'profile';
  runner: RunnerType;
  
  // Benchmark options
  time: number;
  warmupTime?: number;
  warmupRuns?: number;
  iterations?: number;
  
  // Features
  useBaseline: boolean;
  showCpu: boolean;
  observeGc: boolean;
  collectGc: boolean;
}

/** Default benchmark runner options */
const defaultRunnerOptions = {
  tinybench: {
    warmupTime: 100,
    warmupRuns: 10,
  },
  manual: {
    warmupRuns: 10,
    iterations: 12,
  },
  standard: {},
  "vanilla-mitata": {},
} as const;

/** Create a unified config from CLI arguments */
export function createConfig(argv: CliArgs): BenchConfig {
  // Determine test source
  const testSource = argv.simple ? 'simple' : 'wesl';
  
  // Determine execution mode
  let mode: BenchConfig['mode'] = 'standard';
  if (argv.profile) {
    mode = 'profile';
  } else if (argv.worker) {
    mode = 'worker';
  }
  
  // Select runner
  let runner: RunnerType = 'standard';
  if (argv.mitata) {
    runner = 'vanilla-mitata';
  } else if (argv.tinybench) {
    runner = 'tinybench';
  } else if (argv.manual) {
    runner = 'manual';
  }
  
  // Get runner-specific options
  const runnerOpts = defaultRunnerOptions[runner];
  
  // Validate variants
  const variants = validateVariants(argv.variant as string[] || []);
  
  return {
    // Test selection
    filter: argv.filter,
    variants,
    testSource,
    simpleTestName: argv.simple,
    
    // Execution mode
    mode,
    runner,
    
    // Benchmark options
    time: argv.time,
    warmupTime: 'warmupTime' in runnerOpts ? runnerOpts.warmupTime : undefined,
    warmupRuns: 'warmupRuns' in runnerOpts ? runnerOpts.warmupRuns : undefined,
    iterations: 'iterations' in runnerOpts ? runnerOpts.iterations : undefined,
    
    // Features
    useBaseline: argv.baseline && mode !== 'profile',
    showCpu: argv.cpu,
    observeGc: argv.observeGc,
    collectGc: argv.collect,
  };
}

/** Validate requested variants */
function validateVariants(variants: string[]): ParserVariant[] {
  const ALL_VARIANTS: ParserVariant[] = ["link", "parse", "tokenize", "wgsl_reflect"];
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