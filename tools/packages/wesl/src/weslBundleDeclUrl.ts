// Path is relative to dist/ where the compiled JS will run from
export const weslBundleDeclUrl = new URL(
  "../src/WeslBundle.ts",
  import.meta.url,
).href;
