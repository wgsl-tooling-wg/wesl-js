import { allBulkTests } from "../findBulkTests.ts";
import { testWgslFiles } from "../testWgslFiles.ts";

const somePaths = allBulkTests.filter(p =>
  p.shortPath.includes("wireframe.wgsl"),
);
testWgslFiles(somePaths);
