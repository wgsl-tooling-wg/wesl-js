import { WeslStream } from "@wesl/wesl";

/** Remove extra bits from WGSL for test comparisons.
 *
 * removes:
 *  . extra whitespace,
 *  . comments,
 *  . trailing commas in brackets, paren, and array containers
 */
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
      const nextText = nextToken?.text;
      if (nextText === "}" || nextText === "]" || nextText === ")") {
        // Ignore trailing comma
        result += " ";
        result += nextText;
      } else {
        result += ", " + (nextToken?.text ?? "");
      }
    } else {
      result += " " + token.text;
    }
  }
}
