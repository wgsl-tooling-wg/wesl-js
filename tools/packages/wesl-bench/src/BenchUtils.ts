/** @return concatenated text from all source modules */
export function srcToText(weslSrc: Record<string, string>): string {
  return Object.values(weslSrc).join("\n");
}

/** @return all tokens from text */
export function tokenize(
  text: string,
  WeslStream: new (text: string) => any,
): unknown[] {
  const stream = new WeslStream(text);
  const tokens = [];
  while (true) {
    const token = stream.nextToken();
    if (token === null) break;
    tokens.push(token);
  }
  return tokens;
}
