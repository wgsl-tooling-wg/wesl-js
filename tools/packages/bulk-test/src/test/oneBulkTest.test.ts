import { allBulkTests } from "../findBulkTests.ts";
import { testWgslFiles } from "../testWgslFiles.ts";

const somePaths = allBulkTests.filter(p => p.name.includes("fullscreenTexturedQuad.wgsl"));
testWgslFiles(somePaths);