import type { Tree } from "@lezer/common";

const errorSnippetLength = 40;

/** Walk a lezer tree and return snippets around each error node. */
export function findErrors(tree: Tree, src: string): string[] {
  const errors: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        const snippet = src.slice(node.from, node.from + errorSnippetLength);
        errors.push(`${node.from}: "${snippet.replace(/\n/g, "\\n")}"`);
      }
    },
  });
  return errors;
}
