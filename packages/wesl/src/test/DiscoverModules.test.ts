import { expect, test } from "vitest";
import { discoverModules } from "../discovery/FindUnboundIdents.ts";
import { RecordResolver } from "../ModuleResolver.ts";

test("discoverModules returns only reachable modules", () => {
  const weslSrc: Record<string, string> = {
    "main.wesl": `
      import package::util::helper;
      fn main() { helper(); }
    `,
    "util.wesl": `fn helper() {}`,
    "unused.wesl": `fn unused() {}`,
  };
  const result = discoverModules(
    weslSrc,
    new RecordResolver(weslSrc),
    "package::main",
  );
  const keys = Object.keys(result.weslSrc);

  expect(keys).toContain("main.wesl");
  expect(keys).toContain("util.wesl");
  expect(keys).not.toContain("unused.wesl");
});

test("discoverModules finds unbound external refs", () => {
  const weslSrc: Record<string, string> = {
    "main.wesl": `
      import ext_pkg::dep;
      fn main() { dep(); }
    `,
  };
  const result = discoverModules(
    weslSrc,
    new RecordResolver(weslSrc),
    "package::main",
  );
  expect(result.unbound).toContainEqual(["ext_pkg", "dep"]);
});

test("discoverModules finds refs in conditional branches", () => {
  const weslSrc: Record<string, string> = {
    "main.wesl": `
      import package::a;
      import package::b;
      fn main() {
        @if(feature) a::run();
        @else b::run();
      }
    `,
    "a.wesl": `
      import ext_a::dep;
      fn run() { dep(); }
    `,
    "b.wesl": `
      import ext_b::dep;
      fn run() { dep(); }
    `,
    "unused.wesl": `fn unused() {}`,
  };
  const result = discoverModules(
    weslSrc,
    new RecordResolver(weslSrc),
    "package::main",
  );
  const keys = Object.keys(result.weslSrc);

  expect(keys).toContain("a.wesl");
  expect(keys).toContain("b.wesl");
  expect(keys).not.toContain("unused.wesl");

  expect(result.unbound).toContainEqual(["ext_a", "dep"]);
  expect(result.unbound).toContainEqual(["ext_b", "dep"]);
});

test("discoverModules excludes modules only reachable from other roots", () => {
  const weslSrc: Record<string, string> = {
    "main.wesl": `
      import package::shared;
      fn main() { shared::helper(); }
    `,
    "other.wesl": `
      import package::only_other;
      fn other() { only_other::run(); }
    `,
    "shared.wesl": `fn helper() {}`,
    "only_other.wesl": `fn run() {}`,
  };
  const result = discoverModules(
    weslSrc,
    new RecordResolver(weslSrc),
    "package::main",
  );
  const keys = Object.keys(result.weslSrc);

  expect(keys).toContain("main.wesl");
  expect(keys).toContain("shared.wesl");
  expect(keys).not.toContain("other.wesl");
  expect(keys).not.toContain("only_other.wesl");
});

test("discoverModules with single-file project", () => {
  const weslSrc: Record<string, string> = {
    "main.wesl": `fn main() { let x = 1; }`,
  };
  const result = discoverModules(
    weslSrc,
    new RecordResolver(weslSrc),
    "package::main",
  );
  expect(Object.keys(result.weslSrc)).toEqual(["main.wesl"]);
  expect(result.unbound).toEqual([]);
});
