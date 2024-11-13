import { _withBaseLogger } from "mini-parse";
import { logCatch } from "mini-parse/test-util";

import { expect, test } from "vitest";
import { ModuleElem, TreeImportElem } from "../AbstractElems.js";
import { treeToString } from "../ImportTree.js";
import { directive } from "../ParseDirective.js";
import { parseWgslD } from "../ParseWgslD.js";
import { testAppParse } from "./TestUtil.js";

test("directive parses #export", () => {
  const { appState } = testAppParse(directive, "#export");
  expect(appState[0].kind).toBe("export");
});

test("parse #export", () => {
  const parsed = parseWgslD("#export");
  expect(parsed[0].kind).toBe("export");
});

test("parse import foo/bar", () => {
  const parsed = parseWgslD("import foo/bar");
  expect(parsed).toMatchSnapshot();
});

test("parse #export(foo) with trailing space", () => {
  const src = `
    export (Elem) 
  `;

  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("#export w/o closing paren", () => {
  const src = `#export (A
    )
    `;
  const { log, logged } = logCatch();
  _withBaseLogger(log, () => parseWgslD(src));
  expect(logged()).toMatchInlineSnapshot(`
    "expected text ')''
    #export (A   Ln 1
              ^"
  `);
});

test("parse module foo.bar.ca", () => {
  const src = `module foo.bar.ca`;
  const appState = parseWgslD(src);
  expect(appState[0].kind).toBe("module");
  expect((appState[0] as ModuleElem).name).toBe("foo.bar.ca");
});

test("module foo.bar.ca", ctx => {
  const appState = parseWgslD(ctx.task.name);
  expect(appState[0].kind).toBe("module");
  expect((appState[0] as ModuleElem).name).toBe("foo.bar.ca");
});

test("module foo::bar::ba", ctx => {
  const appState = parseWgslD(ctx.task.name);
  expect(appState[0].kind).toBe("module");
  expect((appState[0] as ModuleElem).name).toBe("foo/bar/ba");
});

test("module foo/bar/ba", ctx => {
  const appState = parseWgslD(ctx.task.name);
  expect(appState[0].kind).toBe("module");
  expect((appState[0] as ModuleElem).name).toBe("foo/bar/ba");
});

test("import ./util/foo;", ctx => {
  const appState = parseWgslD(ctx.task.name);
  const importElem = appState[0] as TreeImportElem;
  const segments = treeToString(importElem.imports);
  expect(segments).toBe("./util/foo");
});

test("import ./bar/foo;", ctx => {
  const appState = parseWgslD(ctx.task.name);
  const importElem = appState[0] as TreeImportElem;
  const segments = treeToString(importElem.imports);
  expect(segments).toBe("./bar/foo");
});

test("import ./bar/{foo,bar};", ctx => {
  const appState = parseWgslD(ctx.task.name);
  const imports = appState.filter(e => e.kind === "treeImport");
  const segments = imports.map(i => treeToString(i.imports));
  expect(segments).toContain("./bar/{(foo), (bar)}");
});
