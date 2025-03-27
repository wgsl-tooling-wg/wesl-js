import { importCases } from "wesl-testsuite";
import { testFromCase } from "./TestLink.ts";

importCases.forEach((c) => {
  Deno.test(c.name, () => testFromCase(c));
});
