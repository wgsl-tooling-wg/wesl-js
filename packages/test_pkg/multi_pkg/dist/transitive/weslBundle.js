import dependent_package from "dependent_package";

export const weslBundle = {
  name: "multi_pkg",
  edition: "unstable_2025_1",
  modules: {
    "transitive.wesl":
      "import dependent_package::dep;\n\nfn toDep() { dep(); }",
  },
  dependencies: [dependent_package],
};

export default weslBundle;
