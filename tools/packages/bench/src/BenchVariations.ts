import path from "node:path";
import { link, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import { baselineDir } from "../bin/bench.ts";

export type ParserVariant =
  | "link"
  | "parse"
  | "tokenize"
  | "wgsl_reflect"
  | "use-gpu";

type BenchFunction = (params: {
  weslSrc: Record<string, string>;
  rootModuleName: string;
}) => any;

type FnAndBaseline = {
  current: BenchFunction;
  baseline?: BenchFunction;
};

/** create benchmark functions based on the selected variant */
export async function createVariantFunction(
  variant: ParserVariant,
  useBaseline: boolean,
): Promise<FnAndBaseline> {
  let baselineImports: any;

  if (useBaseline) {
    // Try to load baseline functions
    try {
      const baselinePath = path.join(baselineDir, "packages/wesl/src/index.ts");
      baselineImports = await import(baselinePath);
    } catch (e) {
      console.log("Failed to load baseline functions for variant", variant, e);
    }
  }

  switch (variant) {
    case "link":
      return { current: link, baseline: baselineImports?.link };

    case "parse":
      return parseFns(baselineImports);

    case "tokenize":
      return tokenizeFns(baselineImports);

    case "wgsl_reflect":
      return wgslReflectFns();

    case "use-gpu":
      // TODO: implement use-gpu variant
      throw new Error("use-gpu variant not yet implemented");

    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}

/** return benchmark functions for "parse" variant  */
function parseFns(baselineImports: any): FnAndBaseline {
  function current(args: { weslSrc: Record<string, string> }): any {
    const registry = parsedRegistry();
    parseIntoRegistry(args.weslSrc, registry, "package");
    return registry;
  }

  const basedParseIntoRegistry = baselineImports?.parseIntoRegistry;
  const basedParsedRegistry = baselineImports?.parsedRegistry;
  let baseline: BenchFunction | undefined;
  if (basedParseIntoRegistry && basedParsedRegistry) {
    baseline = ({ weslSrc }) => {
      const registry = basedParsedRegistry();
      basedParseIntoRegistry(weslSrc, registry, "package");
      return registry;
    };
  }

  return { current, baseline };
}

/** return benchmark functions for "tokenize" variant  */
function tokenizeFns(baselineImports: any): FnAndBaseline {
  let baseline: BenchFunction | undefined;
  if (baselineImports?.WeslStream) {
    baseline = makeTokenize(baselineImports.WeslStream);
  }

  return { current: makeTokenize(WeslStream), baseline };
}

function makeTokenize(streamClass: typeof WeslStream): BenchFunction {
  return ({ weslSrc }) => {
    const allText = Object.values(weslSrc).join("\n");
    const stream = new streamClass(allText);
    const tokens = [];
    while (true) {
      const token = stream.nextToken();
      if (token === null) break;
      tokens.push(token);
    }
    return tokens;
  };
}

function wgslReflectFns(): FnAndBaseline {
  return {
    current: ({ weslSrc }) => {
      const allText = Object.values(weslSrc).join("\n");
      return new WgslReflect(allText);
    },
  };
}
