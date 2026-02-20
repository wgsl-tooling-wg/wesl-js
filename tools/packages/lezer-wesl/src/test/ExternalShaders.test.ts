import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { parser } from "../parser.js";
import { findErrors } from "./ErrorFree.ts";
import { checkHighlights, parseWithHighlighting } from "./HighlightCheck.ts";
import { validateFile } from "./ValidateFixture.ts";

const dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(dir, "../../../../..");

const sources: Record<string, string> = {
  testsuite: join(repoRoot, "wesl-testsuite/shaders"),
  bench: join(repoRoot, "tools/packages/bench/src/wesl-examples"),
};

// Files with unresolvable template placeholders (e.g. {OUTPUT_FORMAT})
const skip = new Set(["webgpu-samples/sample/cornell/tonemapper.wgsl"]);

/** Node types that should receive a highlight class. */
const shouldBeStyled = new Set([
  "Identifier",
  "BuiltinType",
  "BuiltinFn",
  "Number",
  "Boolean",
  "LineComment",
  "BlockComment",
]);

for (const [label, cwd] of Object.entries(sources)) {
  const files = globSync("**/*.{wgsl,wesl}", { cwd });
  for (const file of files.sort()) {
    if (skip.has(file)) continue;
    const name = `${label}/${file}`;
    const src = readFileSync(join(cwd, file), "utf-8");

    test(`error-free ${name}`, () => {
      const tree = parser.parse(src);
      const errors = findErrors(tree, src);
      expect(errors, `Parse errors in ${name}`).toEqual([]);
    });

    test(`validate ${name}`, () => {
      const result = validateFile(name, src);
      expect(result.matching).toBeGreaterThan(0);
      expect(
        result.missingInLezer,
        `${name}: wesl nodes missing in lezer`,
      ).toEqual([]);
    });

    test(`highlights ${name}`, () => {
      const tree = parseWithHighlighting(src);
      const styledRanges = checkHighlights(src);
      const styledSet = new Set(styledRanges.map(s => `${s.from}:${s.to}`));
      const unstyled: string[] = [];
      tree.iterate({
        enter(node) {
          if (!shouldBeStyled.has(node.type.name)) return;
          if (!styledSet.has(`${node.from}:${node.to}`)) {
            const text = src.slice(node.from, node.from + 20);
            unstyled.push(`${node.type.name} "${text}" at ${node.from}`);
          }
        },
      });
      expect(unstyled, `unstyled nodes in ${name}`).toEqual([]);
    });
  }
}
