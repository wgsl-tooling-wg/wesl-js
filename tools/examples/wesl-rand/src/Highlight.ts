import { defaultHighlightStyle } from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";
import { wgslLanguage } from "@iizukak/codemirror-lang-wgsl";
import { StyleModule } from "style-mod";

StyleModule.mount(document, defaultHighlightStyle.module!);

const div = document.createElement("div");
function escape(text: string) {
  div.textContent = text;
  return div.innerHTML;
}

/** pretty print wgsl into html */
export function wgslToHTML(code: string): string {
  let dom = "";
  let last = 0;
  highlightTree(
    wgslLanguage.parser.parse(code),
    defaultHighlightStyle,
    (from, to, classes) => {
      if (from > last) {
        dom += `<span>${escape(code.slice(last, from))}</span>`;
      }
      dom += `<span class="${classes}">${escape(code.slice(from, to))}</span>`;
      last = to;
    }
  );
  if (last < code.length) {
    dom += `<span>${escape(code.slice(last))}</span>`;
  }
  return `<div>${dom}<div>`;
}
