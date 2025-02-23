import { assertThat } from "./Assertions.js";
import { Span } from "./Span.js";
import { SrcMap, SrcMapEntry } from "./SrcMap.js";

// TODO untested

export class SpannedText {
  constructor(
    /** Span of the text in the real source */
    public readonly srcSpan: Span,
    /** Text (and nested elements) at that location */
    public readonly children: (string | SpannedText | SyntheticText)[],
  ) {
    let current = srcSpan[0];
    for (const child of children) {
      if (child instanceof SpannedText) {
        assertThat(
          current <= child.srcSpan[0],
          "Children must be inserted in order",
        );
        current = child.srcSpan[1];
      }
    }
    assertThat(
      current <= srcSpan[1],
      "Child spans must be contained within the parent span",
    );
  }

  build(source: string): SrcMap {
    let dest = "";
    let entries: SrcMapEntry[] = [];

    // SpannedText: We know the exact span
    // string: We map them to the remaining span. Multiple strings in a row are merged.
    // SyntheticText: Explicitly does not have a source span. (Span of zero)

    function buildInner(spannedText: SpannedText) {
      if (spannedText.children.length === 0) return;

      let textStartSrc = spannedText.srcSpan[0];
      for (let i = 0; i < spannedText.children.length; i++) {
        const child = spannedText.children[i];
        let destStart = dest.length;
        if (child instanceof SpannedText) {
          buildInner(child);
          textStartSrc = child.srcSpan[1];
        } else if (child instanceof SyntheticText) {
          dest += child.value;
          entries.push({
            src: child.value,
            srcStart: 0,
            srcEnd: child.value.length,
            destStart,
            destEnd: dest.length,
          });
        } else {
          // Text range goes until the next actual source span
          dest += child;
          // Merge next children if they're also text
          while (
            i + 1 < spannedText.children.length &&
            typeof spannedText.children[i + 1] === "string"
          ) {
            dest += spannedText.children[i + 1];
            i += 1;
          }
          // Now i points at the last string
          // Skip over the synthetic texts, and find the end of the text
          let srcEnd =
            spannedText.children
              .slice(i + 1)
              .find(v => v instanceof SpannedText)?.srcSpan?.[0] ??
            spannedText.srcSpan[1];
          textStartSrc = srcEnd;
          entries.push({
            src: source,
            srcStart: textStartSrc,
            srcEnd,
            destStart,
            destEnd: dest.length,
          });
        }
      }
    }
    buildInner(this);

    return new SrcMap(dest, entries);
  }
}

export function spannedText(
  span: Span,
  ...children: (string | SpannedText | SyntheticText)[]
): SpannedText {
  return new SpannedText(span, children);
}

export class SyntheticText {
  constructor(public readonly value: string) {}
}

export function syntheticText(text: string): SyntheticText {
  return new SyntheticText(text);
}

export function joinSrcMaps(srcMaps: SrcMap[]) {
  let dest = srcMaps.map(v => v.dest).join("");
  let entries = srcMaps.flatMap(v => v.entries);
  const map = new SrcMap(dest, entries);
  map.compact();
  return map;
}
