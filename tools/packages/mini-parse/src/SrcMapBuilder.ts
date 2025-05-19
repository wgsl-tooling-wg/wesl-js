import { SrcMap, type SrcMapEntry, type SrcWithPath } from "./SrcMap.js";

/**
 * Incrementally append to a string, tracking source references
 */
export class SrcMapBuilder {
  #fragments: string[] = [];
  #destLength = 0;
  #entries: SrcMapEntry[] = [];

  constructor(public source: SrcWithPath) {}

  /** append a string fragment to the destination string */
  add(fragment: string, srcStart: number, srcEnd: number): void {
    // dlog({fragment})
    const destStart = this.#destLength;
    this.#destLength += fragment.length;
    const destEnd = this.#destLength;

    this.#fragments.push(fragment);
    this.#entries.push({
      src: this.source,
      srcStart,
      srcEnd,
      destStart,
      destEnd,
    });
  }

  /**
   * Append a fragment to the destination string,
   * mapping source to the pervious,
   * and guessing that the source fragment is just as long as the the dest fragment.
   * (LATER we plan to drop or make optional src end positions)
   */
  appendNext(fragment: string): void {
    const lastEnd = this.#entries.at(-1)?.destEnd ?? 0;
    this.add(fragment, lastEnd, lastEnd + fragment.length);
  }

  addSynthetic(
    fragment: string,
    syntheticSource: string,
    srcStart: number,
    srcEnd: number,
  ): void {
    // dlog({fragment})
    const destStart = this.#destLength;
    this.#destLength += fragment.length;
    const destEnd = this.#destLength;

    this.#fragments.push(fragment);
    this.#entries.push({
      src: { text: syntheticSource },
      srcStart,
      srcEnd,
      destStart,
      destEnd,
    });
  }

  /** append a synthetic newline, mapped to previous source location */
  addNl(): void {
    const lastEntry = this.#entries.at(-1) ?? { srcStart: 0, srcEnd: 0 };
    const { srcStart, srcEnd } = lastEntry;
    this.add("\n", srcStart, srcEnd);
  }

  /** copy a string fragment from the src to the destination string */
  addCopy(srcStart: number, srcEnd: number): void {
    const fragment = this.source.text.slice(srcStart, srcEnd);
    this.add(fragment, srcStart, srcEnd);
  }

  /** return a SrcMap */
  static build(builders: SrcMapBuilder[]): SrcMap {
    const map = new SrcMap(
      { text: builders.map(b => b.#fragments.join("")).join("") },
      builders.flatMap(b => b.#entries),
    );
    map.compact();
    return map;
  }
}
