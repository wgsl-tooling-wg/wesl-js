// biome-ignore format: readability
/** Convert union to intersection - https://mighdoll.dev/blog/modern-typescript-intersection/ */
export type UnionToIntersection<U> = 
    (U extends any ? 
      (k: U) => void : never) extends 
      (k: infer I extends U) => void ? 
    I : never;
