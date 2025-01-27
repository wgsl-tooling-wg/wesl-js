import {
  ImportCollection,
  ImportItem,
  ImportStatement,
} from "../ImportTree.ts";

export function importToString(tree: ImportStatement): string {
  return [
    ...tree.segments.map(s => s.name),
    segmentToString(tree.finalSegment),
  ].join("::");
}

function segmentToString(segment: ImportCollection | ImportItem): string {
  if (segment instanceof ImportItem) {
    const { name, as } = segment;
    const asMsg = as ? ` as ${as}` : "";
    return `${name}${asMsg}`;
  } else if (segment instanceof ImportCollection) {
    return `{${segment.subTrees.map(s => importToString(s)).join(", ")}}`;
  } else {
    return `|unknown segment type ${(segment as any).constructor.name}|`;
  }
}
