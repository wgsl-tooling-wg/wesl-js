import { NoBacktrack, NoTags, Parser, TagRecord } from "./Parser.js";

/** Typescript types for parser combinators */

/** Intersection of types.
 * @param U is normally a union type, e.g. A | B | C
 * @return type intersection version of U, e.g. A & B & C
 *
 * Works by placing U into contraviant position, and then inferring its type.
 * See https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types
 * and https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 *
 * (and wrapping things in conditional types with ? : never gives us a stage to place the inferencing)
 */
export type Intersection<U> =
  (U extends any ? (k: U) => void : never) extends (
    (k: infer I extends U) => void
  ) ?
    I
  : never;

/**
 * @param T a Record type
 * @returns a Record type with the keys explictly defined, if possible.
 */
export type KeyedRecord<T> = { [A in keyof T]: T[A] };

/**
 * This type describes the variations for parser combinator arguments.
 *
 * Parser combinators seq(), or() and similiar combinators
 * combine other parsers they take as function arguments.
 * Standard combinators also accept arguments that are nullary functions
 * returning a parser (for lazy initialization),
 * or simple string arguments. Strings are later converted to text() parsers.
 */
export type CombinatorArg<B extends boolean = boolean> =
  | Parser<any, TagRecord, B>
  | string
  | (() => Parser<any, TagRecord, B>);

/**
 * @return Parser corresponding to a single CombinatorArg.
 *
 * examples:
 *    for combinator("some_string"), the argument is "some_string"
 *      the Parser corresponding to "some_string" is Parser<string, NoNameRecord>
 *    if the combinator argument is Parser<number[], {n:number[]}>
 *      the corresponding parser is Parser<number[], {n:number[]}>
 *    if the combinator argument is () => Parser<string, {n:number[]}>
 *      the corresponding parser is Parser<string, {n:number[]}>
 */
export type ParserFromArg<A extends CombinatorArg> = Parser<
  ResultFromArg<A>,
  TagsFromArg<A>,
  BacktrackFromArg<A>
>;

/**
 * @return Parser corresponding to an array that repeats the same CombinatorArg.
 */
export type ParserFromRepeatArg<A extends CombinatorArg> = Parser<
  ResultFromArg<A>[],
  TagsFromArg<A>,
  BacktrackFromArg<A>
>;

/** Result value type returned by a parser specified by a CombinatorArg */
export type ResultFromArg<A extends CombinatorArg> =
  A extends Parser<infer R, any, boolean> ? R
  : A extends string ? string
  : A extends () => Parser<infer R, any, boolean> ? R
  : never;

/** parser tags type returned by parser specified by a CombinatorArg */
export type TagsFromArg<A extends CombinatorArg> =
  A extends Parser<any, infer T, boolean> ? T
  : A extends string ? NoTags
  : A extends () => Parser<any, infer T, boolean> ? T
  : never;

export type BacktrackFromArg<A extends CombinatorArg> =
  A extends Parser<any, any, infer B> ? B
  : A extends string ? NoBacktrack
  : A extends () => Parser<any, any, infer B> ? B
  : never;

/** Parser type returned by seq(),
 *    concatenates the argument result types into an array
 *    and intersects the argument name records into a single keyed record.
 * @param P type of arguments to seq()
 */
export type SeqParser<P extends CombinatorArg[]> = Parser<
  SeqValues<P>,
  SeqTags<P>,
  BacktrackFromArg<P[0]>
>;

export type SeqObjParser<P extends { [key: string]: CombinatorArg }> = Parser<
  { [key in keyof P]: ResultFromArg<P[key]> },
  Intersection<TagsFromArg<P[string]>>
>;

/**
 * The type of an array of parsed result values from an array of parsers specified
 * by CombinatorArgs.
 *
 * Note that although looks like an object type given the {} syntax, it's not.
 * As of TS 3.1, type mapping over keys of an array or tuple returns an array or tuple type, not an object type.
 */
export type SeqValues<P extends CombinatorArg[]> = {
  [key in keyof P]: ResultFromArg<P[key]>;
};

type SeqTags<P extends CombinatorArg[]> = Intersection<TagsFromArg<P[number]>>;

export type OrParser<P extends CombinatorArg[]> = Parser<
  OrValues<P>,
  OrNames<P>,
  false
>;

type OrValues<P extends CombinatorArg[]> = ResultFromArg<P[number]>;
type OrNames<P extends CombinatorArg[]> = TagsFromArg<P[number]>;
