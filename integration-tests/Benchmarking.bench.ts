import { WGSLLinker } from "@use-gpu/shader";
import {
  link,
  parseSrcModule,
  SrcModule,
  WeslAST,
  WeslStream,
  WeslToken,
} from "@wesl/wesl";
import { WgslReflect } from "wgsl_reflect";

type CompareTo =
  | "wgsl_reflect"
  | "use-gpu";

/** Set this to run the benchmark against a different project */
const compareTo = null as CompareTo | null;

const tests = await loadAllFiles();

for (const instance of tests) {
  Deno.bench({
    name: `WESL Tokenizer (${instance.name})`,
    group: instance.name,
    fn() {
      for (const [_, text] of instance.files) {
        tokenizeWESL(text);
      }
    },
  });

  Deno.bench({
    name: `WESL Parser (${instance.name})`,
    group: instance.name,
    fn() {
      for (const [_, text] of instance.files) {
        parseWESL(text);
      }
    },
  });

  Deno.bench({
    name: `WESL Linker (${instance.name})`,
    group: instance.name,
    fn() {
      link({
        weslSrc: Object.fromEntries(instance.files.entries()),
        rootModuleName: instance.mainFile,
      });
    },
  });

  Deno.bench({
    name: `${compareTo} (${instance.name})`,
    group: instance.name,
    // Skip tests if we aren't comparing, or if it's a wesl-specific benchmark
    ignore: compareTo === null || instance.isWesl,
    fn() {
      if (compareTo === "wgsl_reflect") {
        for (const [path, text] of instance.files) {
          wgslReflectParse(path, text);
        }
      } else if (compareTo === "use-gpu") {
        for (const [path, text] of instance.files) {
          useGpuParse(path, text);
        }
      } else {
        compareTo satisfies null;
      }
    },
  });
}

interface BenchTest {
  name: string;
  /** Path to the main file */
  mainFile: string;
  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;

  isWesl: boolean;
}

async function loadAllFiles(): Promise<BenchTest[]> {
  const examplesDir = "./benches/";
  const reduceBuffer = await loadBench(
    "reduceBuffer",
    examplesDir,
    "./reduceBuffer.wgsl",
  );
  const particle = await loadBench(
    "particle",
    examplesDir,
    "./particle.wgsl",
  );
  const rasterize = await loadBench(
    "rasterize",
    examplesDir,
    "./rasterize_05_fine.wgsl",
  );
  const boat = await loadBench(
    "unity_webgpu_0000026E5689B260",
    examplesDir,
    "./unity_webgpu_000002B8376A5020.fs.wgsl",
  );
  const imports_only = await loadBench(
    "imports_only",
    examplesDir,
    "./imports_only.wgsl",
  );
  const bevy_deferred_lighting = await loadBench(
    "bevy_deferred_lighting",
    examplesDir + "/bevy/",
    "./bevy_generated_deferred_lighting.wgsl",
  );
  const bevy_linking = await loadBench(
    "bevy_linking",
    examplesDir + "/naga_oil_example/",
    "./pbr.wgsl",
    [
      "./clustered_forward.wgsl",
      "./mesh_bindings.wgsl",
      "./mesh_types.wgsl",
      "./mesh_vertex_output.wgsl",
      "./mesh_view_bindings.wgsl",
      "./mesh_view_types.wgsl",
      "./pbr_bindings.wgsl",
      "./pbr_functions.wgsl",
      "./pbr_lighting.wgsl",
      "./pbr_types.wgsl",
      "./shadows.wgsl",
      "./utils.wgsl",
    ],
    true,
  );
  return [
    reduceBuffer,
    particle,
    rasterize,
    boat,
    imports_only,
    bevy_deferred_lighting,
    bevy_linking,
  ];
}

async function loadBench(
  name: string,
  cwd: string,
  mainFile: string,
  extraFiles: string[] = [],
  isWesl = false,
): Promise<BenchTest> {
  const files = new Map<string, string>();
  const addFile = async (p: string) =>
    files.set(
      p,
      await Deno.readTextFile(new URL(p, new URL(cwd, import.meta.url))),
    );
  await addFile(mainFile);
  for (const path of extraFiles) {
    await addFile(path);
  }
  return { name, mainFile, files, isWesl };
}

function wgslReflectParse(_filePath: string, text: string): void {
  new WgslReflect(text);
}

function useGpuParse(_filePath: string, text: string): void {
  WGSLLinker.loadModule(text);
}

/** parse a single wesl file */
function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule, undefined);
}

function tokenizeWESL(src: string): WeslToken[] {
  const stream = new WeslStream(src);
  const tokens: WeslToken[] = [];
  while (true) {
    const token = stream.nextToken();
    if (token === null) {
      return tokens;
    }
    tokens.push(token);
  }
}
