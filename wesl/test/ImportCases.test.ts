import { importCases } from "wesl-testsuite";
import { testFromCase } from "./TestLink.ts";
import { test } from "vitest";

importCases.forEach((c) => {
  test(c.name, () => testFromCase(c));
});
