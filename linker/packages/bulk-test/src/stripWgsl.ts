import { WeslStream } from "wesl";

/** Removes extra whitespace and comments from WGSL */
export function stripWesl(text: string): string {
  const stream = new WeslStream(text);
  const firstToken = stream.nextToken();
  if (firstToken === null) return "";
  let result = firstToken.text;
  while (true) {
    const token = stream.nextToken();
    if (token === null) return result;
    result += " " + token.text;
  }
}
