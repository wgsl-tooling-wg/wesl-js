import { expect, test } from "vitest";
import { sanitizePackageName } from "../discovery/PackageNameUtils.ts";

test("my_package", () => {
  expect(sanitizePackageName("my_package")).toBe("my_package");
});

test("my-package", () => {
  expect(sanitizePackageName("my-package")).toBe("my_package");
});

test("my-cool-package", () => {
  expect(sanitizePackageName("my-cool-package")).toBe("my_cool_package");
});

test("@scope/package", () => {
  expect(sanitizePackageName("@scope/package")).toBe("scope__package");
});

test("@scope/my-package", () => {
  expect(sanitizePackageName("@scope/my-package")).toBe("scope__my_package");
});

test("@scope/my_package", () => {
  expect(sanitizePackageName("@scope/my_package")).toBe("scope__my_package");
});

test("@my-org/my-cool-package", () => {
  expect(sanitizePackageName("@my-org/my-cool-package")).toBe(
    "my_org__my_cool_package",
  );
});
