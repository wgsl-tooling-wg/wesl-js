/** @hidden */
declare module "*?simple_reflect" {
  /**
   * Need to put the import here for it to augment the global scope
   * https://stackoverflow.com/a/51114250/3492994
   */
  export const structs: import("./SimpleReflectExtension.ts").WeslStruct[];
}
