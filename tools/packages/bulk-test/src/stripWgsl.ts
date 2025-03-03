import { WeslStream } from "wesl";

/** Removes extra whitespace, comments, and trailing commas in structs from WGSL */
export function stripWesl(text: string): string {
  const stream = new WeslStream(text);
  const firstToken = stream.nextToken();
  if (firstToken === null) return "";

  let result = firstToken.text;
  while (true) {
    const token = stream.nextToken();
    if (token === null) return result;

    if (token.text === ",") {
      const nextToken = stream.nextToken();
      if (nextToken?.text === "}") {
        // Ignore trailing comma before closing brace
        result += " }";
      } else {
        result += ", " + (nextToken?.text ?? "");
      }
    } else {
      result += " " + token.text;
    }
  }
}
