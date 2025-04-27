
export const weslBundle = {
  "name": "multi_pkg",
  "edition": "unstable_2025_1",
  "modules": {
    "multi.wesl": "import dependent_package::dep;\n\nfn mul() { dep(); } "
  }
}

export default weslBundle;
  