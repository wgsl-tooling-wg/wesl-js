import { FmtDisplay, str } from "../Util.ts";

type IndentedBlock = {
  indent: number;
  text: (string | IndentedBlock)[];
};

export class LineWrapper {
  block: IndentedBlock;

  constructor(indent: number) {
    this.block = {
      indent,
      text: [],
    };
  }

  indentedBlock(indent: number): LineWrapper {
    const newWrapper = new LineWrapper(indent);
    this.block.text.push(newWrapper.block);
    return newWrapper;
  }

  /** add a new line to the constructed string */
  nl() {
    this.block.text.push("\n");
  }

  /** add a string, wrapping to the next line if necessary */
  add(template: TemplateStringsArray, ...params: FmtDisplay[]) {
    this.block.text.push(str(template, ...params));
  }

  /** @return the constructed string */
  print(maxWidth = 60, hangingIndent = 2): string {
    return printBlock(this.block, maxWidth, hangingIndent);
  }
}
function printBlock(
  block: IndentedBlock,
  maxWidth = 60,
  hangingIndent = 2,
): string {
  let result = "";
  const spc = " ".repeat(block.indent);
  const hangingSpc = " ".repeat(hangingIndent);
  for (const s of block.text) {
    const column = getColumn(result);
    if (typeof s === "string") {
      if (column + firstLineLength(s) > maxWidth) {
        result += "\n";
        result += spc;
        result += hangingSpc;
      } else if (column === 0) {
        result += spc;
      }
      result += s;
    } else {
      // A nested block
      result += printBlock(
        { indent: block.indent + s.indent, text: s.text },
        maxWidth,
        hangingIndent,
      );
    }
  }
  return result;
}

function getColumn(text: string): number {
  let afterLastNewline = text.lastIndexOf("\n") + 1;
  return text.length - afterLastNewline;
}

function firstLineLength(s: string): number {
  const i = s.indexOf("\n");
  return i === -1 ? s.length : i;
}
