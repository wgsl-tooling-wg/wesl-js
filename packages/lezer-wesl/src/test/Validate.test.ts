import { test } from "vitest";
import { expectValidation } from "./ValidateFixture.ts";

test("validate imports.wesl", () => expectValidation("imports.wesl"));
test("validate compute.wgsl", () => expectValidation("compute.wgsl"));
test("validate render.wgsl", () => expectValidation("render.wgsl"));
test("validate statements.wgsl", () => expectValidation("statements.wgsl"));
test("validate conditional.wesl", () => expectValidation("conditional.wesl"));
