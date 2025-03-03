import { Span } from "./Span.ts";

export interface SrcWithPath {
  /** User friendly path */
  path?: string;
  text: string;
}

export interface SrcMapBuilder {
  add(fragment: string, srcSpan: Span, isName?: boolean): void;
  addRange(fragment: string, srcStart: number, isName?: boolean): void;
  addSynthetic(fragment: string): void;
}

export interface SrcPosition {
  src: SrcWithPath;
  position: number;
}

/** A source span. It's possible that the end of the generated span doesn't map to a sensible source. */
export interface SrcSpan {
  src: SrcWithPath;
  span: [number, number | null];
}

export class SrcMap {
  private sources: SrcWithPath[] = [];
  private dest: string = "";
  private entries: MinSrcMapEntry[] = [];
  constructor() {}
  builderFor(source: SrcWithPath): SrcMapBuilder {
    const sourceId = this.addSource(source);
    const self = this;
    return {
      add(fragment, srcSpan, isName = false) {
        const isRange = source.text.slice(srcSpan[0], srcSpan[1]) === fragment;
        self.add({
          fragment,
          srcSpan,
          source: sourceId,
          isName,
          isRange,
        });
      },
      addRange(fragment, srcStart, isName = false) {
        const srcText = source.text.slice(srcStart, srcStart + fragment.length);
        const isRange = srcText === fragment;
        if (!isRange) {
          throw new Error(
            `${fragment} is not a range, the underlying text is ${srcText}`,
          );
        }
        self.add({
          fragment,
          srcSpan: [srcStart, srcStart + fragment.length],
          source: sourceId,
          isName,
          isRange,
        });
      },
      addSynthetic(fragment) {
        self.add({
          fragment,
          srcSpan: null,
          source: sourceId,
          isName: false,
          isRange: false,
        });
      },
    };
  }
  addSource(source: SrcWithPath): number {
    const srcId = this.sources.length;
    this.sources.push(source);
    return srcId;
  }
  add(opts: {
    fragment: string;
    srcSpan: Span | null;
    source: number;
    isName: boolean;
    isRange: boolean;
  }) {
    let flags = 0;
    if (opts.isName) {
      flags |= IsNameFlag;
    }
    if (opts.isRange) {
      flags |= IsRangeFlag;
    }
    if (opts.srcSpan === null) {
      flags |= IsSyntheticFlag;
    }
    const srcSpan = opts.srcSpan ?? [0, 0];

    // We do not merge normal source map entries, since that'd lose information
    // When remapping, we map destination locations to clamped source locations
    // We can, however, losslessly merge range entries, and synthetic entries.
    if ((opts.isRange || opts.srcSpan === null) && this.entries.length > 0) {
      const lastEntry = this.entries[this.entries.length - 1];
      const canBeMerged =
        (lastEntry.flags === flags && lastEntry.srcId === opts.source,
        lastEntry.srcEnd === srcSpan[0]);
      if (canBeMerged) {
        lastEntry.srcEnd = srcSpan[1];
        this.dest += opts.fragment;
        return;
      }
    }

    this.entries.push({
      srcId: opts.source,
      srcStart: srcSpan[0],
      srcEnd: srcSpan[1],
      destStart: this.dest.length,
      flags,
    });
    this.dest += opts.fragment;
  }

  /** Gets a source map entry. Filters out synthetic entries. */
  private getEntry(destPos: number): SrcMapEntry | null {
    if (
      this.entries.length === 0 ||
      destPos < 0 ||
      destPos > this.dest.length
    ) {
      return null;
    }
    // LATER use correct binary search
    // e.g. https://github.com/stefnotch/typestef/blob/a705b8a37ced3757ce0c613f75b0ea66fe71e932/src/array-utils.ts#L7
    let nextEntryIndex = this.entries.findIndex(e => destPos < e.destStart);
    if (nextEntryIndex === 0) {
      // The first entry already rejects us
      return null;
    }
    let entryIndex =
      nextEntryIndex === -1 ? this.entries.length - 1 : nextEntryIndex - 1;
    let entry = this.entries[entryIndex];

    if ((entry.flags & IsSyntheticFlag) !== 0) {
      // Attempt to fall back to the nearest non-synthetic entry
      const previousEntry = this.entries.at(entryIndex - 1);
      if (
        destPos === entry.destStart &&
        previousEntry !== undefined &&
        (previousEntry.flags & IsSyntheticFlag) === 0
      ) {
        entryIndex = entryIndex - 1;
        entry = previousEntry;
      } else {
        return null;
      }
    }

    const nextEntryStart =
      this.entries.at(entryIndex + 1)?.destStart ?? this.dest.length;

    return {
      index: entryIndex,
      src: this.sources[entry.srcId],
      srcSpan: [entry.srcStart, entry.srcEnd],
      destSpan: [entry.destStart, nextEntryStart],
      flags: entry.flags,
    };
  }

  /**
   * @return the source position corresponding to a provided destination position
   */
  destToSrc(destPos: number): SrcPosition | null {
    const entry = this.getEntry(destPos);
    if (entry === null) {
      return null;
    }
    const position = mapPosition(entry, destPos, true);
    if (position === null) {
      return null;
    }
    return {
      position,
      src: entry.src,
    };
  }

  /** @return a source span corresponding to the provided destination span */
  destSpanToSrc(destSpan: Span): SrcSpan | null {
    const startEntry = this.getEntry(destSpan[0]);
    if (startEntry === null) {
      return null;
    }
    const startPosition = mapPosition(startEntry, destSpan[0], true);
    if (startPosition === null) {
      return null;
    }

    let endPosition: number | null;
    // destSpan[1] is an exclusive range.
    // also, account for the possibility of it being mapped to a wildly different place
    if (destSpan[1] === destSpan[0]) {
      endPosition = startPosition;
    } else if (destSpan[1] <= startEntry.destSpan[1]) {
      endPosition = mapPosition(startEntry, destSpan[1], false);
    } else {
      const endEntry = this.getEntry(destSpan[1]);
      if (endEntry === null) {
        endPosition = null;
      } else {
        if (endEntry.src !== startEntry.src) {
          return null;
        } else {
          endPosition = mapPosition(endEntry, destSpan[1], false);
          if (endPosition! < startPosition) {
            // Nonsensical end position
            endPosition = null;
          }
        }
      }
    }

    return {
      src: startEntry.src,
      span: [startPosition, endPosition],
    };
  }

  /** @returns the destination text */
  get code(): string {
    return this.dest;
  }
}

type SrcMapEntryFlag = number;
/** Used for identifiers that have a meaning in the original source. */
const IsNameFlag: SrcMapEntryFlag = 1 << 0;
/** Guarantees that every character in the dest can be mapped to the corresponding character in src. */
const IsRangeFlag: SrcMapEntryFlag = 1 << 1;
/** A generated source that cannot be mapped back to the original source. */
const IsSyntheticFlag: SrcMapEntryFlag = 2 << 1;

/** Based more closely off of the src map specification */
interface MinSrcMapEntry {
  srcId: number;
  /** Synthetic entries are mapped to [0,0], and get a special flag. */
  srcStart: number;
  /** Extra field compared to the spec */
  srcEnd: number;
  /**
   * Dest *end* is the dest start of the next entry.
   * If it's a range, then the src length and the dest length will be equal.
   */
  destStart: number;
  flags: SrcMapEntryFlag;
}

/** A decompressed source map entry */
interface SrcMapEntry {
  index: number;
  src: SrcWithPath;
  srcSpan: Span;
  destSpan: Span;
  flags: SrcMapEntryFlag;
}

function mapPosition(
  entry: SrcMapEntry | null,
  destPos: number,
  clampStart: boolean,
): number | null {
  if (entry === null) {
    return null;
  }

  if ((entry.flags & IsRangeFlag) !== 0) {
    // Ranges get mapped to exact positions
    return entry.srcSpan[0] + Math.max(0, destPos - entry.destSpan[0]);
  } else if (destPos === entry.destSpan[0]) {
    return entry.srcSpan[0];
  } else if (destPos === entry.destSpan[1]) {
    return entry.srcSpan[1];
  } else if (clampStart) {
    return entry.srcSpan[0];
  } else {
    return entry.srcSpan[1];
  }
}
