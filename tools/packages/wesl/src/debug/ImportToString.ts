import { assertUnreachable } from "../../../mini-parse/src/Assertions";
import {
  ImportCollection,
  ImportItem,
  ImportStatement,
} from "../parse/ImportElems";

export function importToString(tree: ImportStatement): string {
  return "import " + importToStringImpl(tree) + ";";
}

function importToStringImpl(tree: ImportStatement): string {
  return [
    ...tree.segments.map(s => s.name),
    segmentToString(tree.finalSegment),
  ].join("::");
}

function segmentToString(segment: ImportCollection | ImportItem): string {
  if (segment.kind === "import-item") {
    const { name, as } = segment;
    const asMsg = as ? ` as ${as}` : "";
    return `${name}${asMsg}`;
  } else if (segment.kind === "import-collection") {
    return `{${segment.subtrees.map(s => importToStringImpl(s)).join(", ")}}`;
  } else {
    assertUnreachable(segment);
  }
}
