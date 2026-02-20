import { LanguageSupport, LRLanguage } from "@codemirror/language";
import { type Diagnostic, linter } from "@codemirror/lint";
import { parser, weslHighlighting } from "lezer-wesl";
import {
  type BindResults,
  BundleResolver,
  bindIdents,
  CompositeResolver,
  type Conditions,
  type ModuleResolver,
  RecordResolver,
  type UnboundRef,
  type WeslAST,
  type WeslBundle,
  WeslParseError,
} from "wesl";

export interface WeslLintConfig {
  /** Get all sources keyed by module path (e.g., "package::main"). */
  getSources: () => Record<string, string>;

  /** Root module to validate (e.g., "package::main"). */
  rootModule: () => string;

  /** Runtime conditions for @if conditional compilation. */
  conditions?: () => Conditions;

  /** Package name alias (enables `import mypkg::foo` alongside `import package::foo`). */
  packageName?: () => string | undefined;

  /** External diagnostics (e.g., GPU compilation errors from wgsl-play). */
  getExternalDiagnostics?: () => Diagnostic[];

  /** Get pre-loaded library bundles. */
  getLibs?: () => WeslBundle[];

  /** Fetch libraries on-demand for unresolved external packages. */
  fetchLibs?: (packageNames: string[]) => Promise<WeslBundle[]>;

  /** Package names to ignore when checking unbound externals (e.g. virtual modules). */
  ignorePackages?: () => string[];
}

export const weslLanguage = LRLanguage.define({
  name: "wesl",
  parser: parser.configure({ props: [weslHighlighting] }),
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
  },
});

export function wesl(): LanguageSupport {
  return new LanguageSupport(weslLanguage);
}

/** Create a linter that validates WESL using the canonical parser. */
export function createWeslLinter(config: WeslLintConfig) {
  return linter(async () => lintAndFetch(config), { delay: 300 });
}

/** Lint once, fetch missing externals if needed, re-lint with new libs. */
async function lintAndFetch(config: WeslLintConfig): Promise<Diagnostic[]> {
  const libs = config.getLibs?.() ?? [];
  const ignored = new Set(config.ignorePackages?.() ?? []);
  const { diagnostics, externals } = lintPass(config, libs, ignored);
  if (!config.fetchLibs || !externals.length) return diagnostics;

  const newLibs = await config.fetchLibs(externals);
  if (!newLibs.length) return diagnostics;
  return lintPass(config, [...libs, ...newLibs], ignored).diagnostics;
}

/** Parse, bind, collect diagnostics and discover missing externals. */
function lintPass(
  config: WeslLintConfig,
  libs: WeslBundle[],
  ignored: Set<string>,
): { diagnostics: Diagnostic[]; externals: string[] } {
  const sources = config.getSources();
  const rootModule = config.rootModule();
  const diagnostics: Diagnostic[] = [];
  let externals: string[] = [];

  try {
    const resolver = buildResolver(sources, libs, config.packageName?.());
    const rootAst = resolver.resolveModule(rootModule);
    if (rootAst) {
      const result = runBind(config, resolver, rootAst);
      diagnostics.push(...unboundDiagnostics(result, rootModule, ignored));
      // LATER integrate external fetching into the bind (when we go async), then this becomes unnecessary
      externals = findMissingPackages(rootAst, result, resolver, ignored, libs);
    }
  } catch (e: unknown) {
    const diag = errorToDiagnostic(e);
    if (diag) diagnostics.push(diag);
  }

  diagnostics.push(...(config.getExternalDiagnostics?.() ?? []));
  return { diagnostics, externals };
}

/** Build a resolver from sources and optional libs. */
function buildResolver(
  sources: Record<string, string>,
  libs: WeslBundle[],
  packageName?: string,
): ModuleResolver {
  const record = new RecordResolver(sources, { packageName });
  if (libs.length === 0) return record;
  const resolvers = [record, ...libs.map(b => new BundleResolver(b))];
  return new CompositeResolver(resolvers);
}

/** Parse and bind identifiers starting from a root module. */
function runBind(
  config: WeslLintConfig,
  resolver: ModuleResolver,
  rootAst: WeslAST,
): BindResults {
  return bindIdents({
    resolver,
    rootAst,
    conditions: config.conditions?.(),
    accumulateUnbound: true,
  });
}

/** Convert unbound refs to diagnostics, skipping ignored packages. */
function unboundDiagnostics(
  result: BindResults,
  rootModule: string,
  ignored: Set<string>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const ref of result.unbound ?? []) {
    if (ref.srcModule.modulePath !== rootModule) continue;
    if (ref.path.length > 1 && ignored.has(ref.path[0])) continue;
    diagnostics.push(unboundToDiagnostic(ref));
  }
  return diagnostics;
}

/** Convert a WESL error to a CodeMirror diagnostic. */
function errorToDiagnostic(e: unknown): Diagnostic | undefined {
  if (e instanceof WeslParseError) {
    const [from, to] = e.span;
    return {
      from,
      to,
      severity: "error",
      message: (e.cause as Error)?.message ?? e.message,
    };
  }
  return undefined;
}

/** Find external package names not yet loaded, from unresolved imports and unbound refs. */
function findMissingPackages(
  rootAst: WeslAST,
  result: BindResults,
  resolver: ModuleResolver,
  ignored: Set<string>,
  libs: WeslBundle[],
): string[] {
  const loaded = new Set(libs.map(b => b.name));
  const pkgs: string[] = [];

  // imports that don't resolve to a known module
  for (const imp of rootAst.imports) {
    const root = imp.segments[0]?.name;
    if (!root || !isExternalRoot(root) || ignored.has(root)) continue;
    const modPath = imp.segments.map(s => s.name).join("::");
    if (!resolver.resolveModule(modPath)) pkgs.push(root);
  }

  // inline path references (e.g. foo::bar) that didn't bind
  for (const ref of result.unbound ?? []) {
    const root = ref.path[0];
    if (
      ref.path.length > 1 &&
      isExternalRoot(root) &&
      !ignored.has(root) &&
      !loaded.has(root)
    )
      pkgs.push(root);
  }

  return [...new Set(pkgs)];
}

/** @return true if root is an external package name (not package/super). */
function isExternalRoot(root: string): boolean {
  return root !== "package" && root !== "super";
}

/** Convert an unbound reference to a CodeMirror diagnostic. */
function unboundToDiagnostic(ref: UnboundRef): Diagnostic {
  return {
    from: ref.start,
    to: ref.end,
    severity: "error",
    message: `unresolved identifier '${ref.path.join("::")}'`,
  };
}
