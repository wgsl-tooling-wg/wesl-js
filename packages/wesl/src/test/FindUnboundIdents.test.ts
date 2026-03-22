import { expect, test } from "vitest";
import { findUnboundIdents } from "../discovery/FindUnboundIdents.ts";
import { RecordResolver } from "../ModuleResolver.ts";

test("ref inside @if block is discovered", () => {
  const srcs = {
    "./test.wesl": `
      import package::util::helper;
      fn main() {
        @if(feature) helper();
      }
    `,
    "./util.wesl": `
      import ext_pkg::dep;
      fn helper() { dep(); }
    `,
  };
  const resolver = new RecordResolver(srcs);
  const unbound = findUnboundIdents(resolver);
  expect(unbound).toContainEqual(["ext_pkg", "dep"]);
});

test("ref inside @else block is discovered", () => {
  const srcs = {
    "./test.wesl": `
      import package::util::a;
      import package::util::b;
      fn main() {
        @if(feature) a();
        @else b();
      }
    `,
    "./util.wesl": `
      import ext_pkg::dep;
      fn a() { }
      fn b() { dep(); }
    `,
  };
  const resolver = new RecordResolver(srcs);
  const unbound = findUnboundIdents(resolver);
  expect(unbound).toContainEqual(["ext_pkg", "dep"]);
});

test("import declaration inside @if block is discovered", () => {
  const srcs = {
    "./test.wesl": `
      @if(feature)
      import ext_pkg::mod::helper;

      fn main() {
        @if(feature) helper();
      }
    `,
  };
  const resolver = new RecordResolver(srcs);
  const unbound = findUnboundIdents(resolver);
  expect(unbound).toContainEqual(["ext_pkg", "mod", "helper"]);
});

test("inline qualified ref inside @if is discovered", () => {
  const srcs = {
    "./test.wesl": `
      fn main() {
        @if(feature) ext_pkg::mod::helper();
      }
    `,
  };
  const resolver = new RecordResolver(srcs);
  const unbound = findUnboundIdents(resolver);
  expect(unbound).toContainEqual(["ext_pkg", "mod", "helper"]);
});
