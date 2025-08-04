// biome-ignore format: readability
/** Convert union type to intersection type: see https://mighdoll.dev/blog/modern-typescript-intersection/ */
export type UnionToIntersection<U> = 
    (U extends any ? 
      (k: U) => void : never) extends 
      (k: infer I extends U) => void ? 
    I : never;
