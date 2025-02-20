// TODO add file or path name to src

import { Span } from "./Span";

export interface SrcMapEntry {
  src: string;
  srcSpan: Span;
  destSpan: Span;
}

export interface SrcPosition {
  src: string;
  position: number;
}

/** map text ranges in multiple src texts to a single dest text */
export class SrcMap {
  entries: SrcMapEntry[];
  dest: string;

  constructor(dest: string, entries: SrcMapEntry[] = []) {
    this.dest = dest;
    this.entries = entries;
  }

  /** add a new mapping from src to dest ranges.
   * entries must be non-overlapping in the destination
   */
  addEntries(newEntries: SrcMapEntry[]): void {
    this.entries.push(...newEntries);
  }

  /** given positions in the dest string,
   * @return corresponding positions in the src strings */
  mapPositions(positions: number[]): SrcPosition[] {
    return positions.map(p => this.destToSrc(p));
  }

  /** internally compress adjacent entries where possible */
  compact(): void {
    if (!this.entries.length) return;
    let prev = this.entries[0];
    const newEntries: SrcMapEntry[] = [prev];

    for (let i = 1; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (
        e.src === prev.src &&
        prev.destSpan[1] === e.destSpan[0] &&
        prev.srcSpan[1] === e.srcSpan[0]
      ) {
        // combine adjacent range entries into one
        prev.destSpan = [prev.destSpan[0], e.destSpan[1]];
        prev.srcSpan = [prev.srcSpan[0], e.srcSpan[1]];
      } else {
        newEntries.push(e);
        prev = e;
      }
    }
    this.entries = newEntries;
  }

  /** sort in destination order */
  sort(): void {
    this.entries.sort((a, b) => a.destSpan[0] - b.destSpan[0]);
  }

  /** This SrcMap's destination is a src for the other srcmap,
   * so combine the two and return the result.
   */
  merge(other: SrcMap): SrcMap {
    if (other === this) return this;

    const mappedEntries = other.entries.filter(e => e.src === this.dest);
    if (mappedEntries.length === 0) {
      console.log("other source map does not link to this one");
      // dlog({ this: this });
      // dlog({ other });
      return other;
    }
    sortSrc(mappedEntries);
    const newEntries = mappedEntries.map(e => {
      const { src, position: srcStart } = this.destToSrc(e.srcSpan[0]);
      const { src: endSrc, position: srcEnd } = this.destToSrc(e.srcSpan[1]);
      if (endSrc !== src) throw new Error("NYI, need to split");
      const newEntry: SrcMapEntry = {
        src,
        srcSpan: [srcStart, srcEnd],
        destSpan: e.destSpan,
      };
      // dlog({ newEntry });
      return newEntry;
    });

    const otherSources = other.entries.filter(e => e.src !== this.dest);

    const newMap = new SrcMap(other.dest, [...otherSources, ...newEntries]);
    newMap.sort();
    return newMap;
  }

  /**
   * @param entries should be sorted in destSpan[0] order
   * @return the source position corresponding to a provided destination position
   *
   */
  destToSrc(destPos: number): SrcPosition {
    const entry = this.entries.find(
      e => e.destSpan[0] <= destPos && e.destSpan[1] >= destPos,
    );
    if (!entry) {
      /* TODO this console.log triggers during debugging, now that preprocessing doesn't produce a real srcMap. 
        remove the warning or fix the reason for the warning?
       */

      // console.log(`no SrcMapEntry for dest position: ${destPos}`);
      return {
        src: this.dest,
        position: destPos,
      };
    }
    return {
      src: entry.src,
      position: entry.srcSpan[0] + destPos - entry.destSpan[0],
    };
  }
}

/** sort entries in place by src start position */
function sortSrc(entries: SrcMapEntry[]): void {
  entries.sort((a, b) => a.srcSpan[0] - b.srcSpan[0]);
}
