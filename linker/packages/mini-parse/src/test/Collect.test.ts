import { testParse } from "mini-parse/test-util";
import { expect, test } from "vitest";
import { tagScope } from "../ParserCollect.js";
import { or, seq, text } from "../ParserCombinator.js";

test("collect runs a fn on commit", () => {
  const src = "a b c";
  const results: string[] = [];
  const p = seq(
    "a",
    text("b").collect(() => results.push("collected")),
    "c",
  ).map(() => results.push("parsed"));

  testParse(p, src);
  expect(results).toEqual(["parsed", "collected"]);
});

test("collect fn sees tags", () => {
  const src = "a b c";
  const results: string[] = [];
  const p = seq(
    text("a").ptag("x"),
    text("b")
      .ptag("y")
      .collect(({ tags }) => {
        results.push(`collected: ${tags.x}, ${tags.y}`);
      }),
    "c",
  );

  testParse(p, src);
  expect(results).toEqual(["collected: a, b"]);
});

test("backtracking", () => {
  const src = "x a b c";
  const results: string[] = [];
  const p = seq(
    "x",
    or(
      seq(
        text("a").ptag("A"), // should not be tagged
        text("N"),
      ).collect(
        () => results.push("collected1"), // should not be called
      ),
      seq("a", text("b").ptag("B"), "c").collect(({ tags }) => {
        const as = tags.A?.[0];
        const bs = tags.B?.[0];
        results.push(`collected2: ${as}, ${bs}`);
      }),
    ),
  );

  testParse(p, src);
  expect(results).toEqual(["collected2: undefined, b"]);
});

test("collect with tag", () => {
  const src = "a b c";
  const results: string[] = [];
  const p = seq(
    "a",
    text("b")
      .collect(() => "x", "1")
      .ctag("B"),
    "c",
  ).collect(cc => {
    // dlog("test collectionFn", { tags: cc.tags });
    results.push(`collected: ${cc.tags.B}`);
  }, "2");
  testParse(p, src);

  expect(results).toEqual(["collected: x"]);
});

test("ctag earlier collect", () => {
  let results: string[] = [];
  const p = or(
    "a",
    text("b").collect(() => "B", "1"),
  )
    .ctag("bee")
    .collect(cc => results.push(`collected: ${cc.tags.bee}`));
  testParse(p, "b");
  expect(results).toEqual(["collected: B"]);
});

test("ctag collect inside seq", () => {
  let results: any[] = [];
  const p = seq(
    "a",
    text("b").collect(() => "B", "1"),
  )
    .ctag("bee")
    .collect(cc => {
      results.push({ bee: cc.tags.bee?.[0] });
    }, "2");
  testParse(p, "a b");
  expect(results).toEqual([{ bee: ["B"] }]);
});

test("tagScope clears tags", () => {
  let results: any[] = [];
  const p = tagScope(
    or(
      text("a")
        .ptag("A")
        .collect(cc => {
          results.push(`inTagScope: ${cc.tags.A?.[0]}`);
        }),
    ),
  ).collect(cc => {
    results.push(`outsideTagScope: ${cc.tags.A?.[0]}`);
  });

  testParse(p, "a");
  expect(results).toMatchInlineSnapshot(`
    [
      "inTagScope: a",
      "outsideTagScope: undefined",
    ]
  `);
});

test("ctag propogates up through seq", () => {
  let results: any[] = [];
  const p = seq(
    "a",
    text("b")
      .collect(() => "B", "collect-1")
      .ctag("btag"),
    text("c"),
  ).collect(cc => results.push({ btag: cc.tags.btag?.flat() }), "collect-2");
  testParse(p, "a b c");
  expect(results).toEqual([{ btag: ["B"] }]);
});

test("tagScope resets original tags", () => {
  let results: any[] = [];
  const p = seq(
    text("a").ptag("atag"),
    tagScope(text("b")), // shouldn't reset 'atag' for later collect
  ).collect(cc => results.push({ atag: cc.tags.atag?.flat() }), "collect-1");
  testParse(p, "a b");
  expect(results).toEqual([{ atag: ["a"] }]);
});

test("collect with ctag param", () => {
  const src = "a b";
  const results: string[] = [];
  const p = seq(
    "a",
    text("b").collect(() => "B", "tagged"),
  ).collect(cc => {
    results.push(`tagged: ${cc.tags.tagged}`);
  });

  testParse(p, src);
  expect(results).toEqual(["tagged: B"]);
});

test("tagScope clears tags on entry", () => {
  let results: any[] = [];

  const p = seq(
    text("a").ptag("A"),
    tagScope(
      text("b")
        .ptag("B")
        .collect(cc => {
          results.push(...Object.keys(cc.tags));
        }),
    ),
  );
  testParse(p, "a b");
  expect(results).toEqual(["B"]);
});
