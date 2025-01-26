import { expect, test } from "vitest";
import util from "node:util";
import process from "node:child_process";

const exec = util.promisify((process as any).exec); // not sure why @types/node for child_process.exec is wrong (nodeExec vs exec)

test("vite generates binding layout", async () => {
  // vite is configured to use the wesl plugin
  // build a test program that imports using the '?reflect' import pattern 
  await exec("pnpm vite build");
  // the test program testMain.ts logs the layout entries to the console for verification
  const result = await exec("pnpm node dist/testMain.cjs");

  expect(result.stdout).toMatchInlineSnapshot(`
    "{
      "myBindingsEntries": [
        {
          "binding": 0,
          "visibility": 4,
          "buffer": {
            "type": "read-only-storage"
          }
        },
        {
          "binding": 1,
          "visibility": 4,
          "buffer": {
            "type": "uniform"
          }
        },
        {
          "binding": 2,
          "visibility": 4,
          "texture": {
            "sampleType": "float"
          }
        },
        {
          "binding": 3,
          "visibility": 4,
          "sampler": {
            "type": "filtering"
          }
        },
        {
          "binding": 4,
          "visibility": 4,
          "storageTexture": {
            "format": "rgba8unorm",
            "sampleType": "float",
            "access": "read-only"
          }
        }
      ]
    }
    "
  `);;
});
