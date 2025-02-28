import { Span } from "./Span.js";
import { SrcMap, SrcMapEntry, SrcWithPath } from "./SrcMap.js";

/**
 * Incrementally append to a string, tracking source references
 */
export class SrcMapBuilder {
  #fragments: string[] = [];
  #destLength = 0;
  #entries: SrcMapEntry[] = [];

  constructor(public source: SrcWithPath) {}

  /** append a string fragment to the destination string */
  // TODO allow for src file name not just string (e.g. SrcModule)
  add(fragment: string, srcSpan: Span): void {
    // dlog({fragment})
    const destStart = this.#destLength;
    this.#destLength += fragment.length;
    const destEnd = this.#destLength;

    this.#fragments.push(fragment);
    this.#entries.push({
      src: this.source,
      srcSpan,
      destSpan: [destStart, destEnd],
    });
  }

  addSynthetic(fragment: string, syntheticSource: string, srcSpan: Span): void {
    // dlog({fragment})
    const destStart = this.#destLength;
    this.#destLength += fragment.length;
    const destEnd = this.#destLength;

    this.#fragments.push(fragment);
    this.#entries.push({
      src: { text: syntheticSource },
      srcSpan,
      destSpan: [destStart, destEnd],
    });
  }

  /** append a synthetic newline, mapped to previous source location */
  addNl(): void {
    const lastEntry = this.#entries.at(-1) ?? { srcSpan: [0, 0] as const };
    const { srcSpan } = lastEntry;
    this.add("\n", srcSpan);
  }

  /** copy a string fragment from the src to the destination string */
  addCopy(srcSpan: Span): void {
    const fragment = this.source.text.slice(srcSpan[0], srcSpan[1]);
    this.add(fragment, srcSpan);
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
