
export function tightLoop(weslSrc: Record<string, string>): number {
  let sum = 0;
  for (const [_, text] of Object.entries(weslSrc)) {
    for (const c of text) {
      sum += c.charCodeAt(0);
    }
  }
  return sum;
}