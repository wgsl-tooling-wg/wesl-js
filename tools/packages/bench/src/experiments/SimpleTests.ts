
/** simple benchmark functions for calibrating bencharmking */

/** runs a loop without memory allocation */
export function tightLoop(weslSrc: Record<string, string>): number {
  let sum = 0;
  for (const [_, text] of Object.entries(weslSrc)) {
    for (const c of text) {
      sum += c.charCodeAt(0);
    }
  }
  return sum;
}

/** runs a loop with some small object allocation, so that garbage collection is required */
export function someAllocation(weslSrc: Record<string, string>): number {
  let sum = 0;
  for (const [_, text] of Object.entries(weslSrc)) {
    for (const c of text) {
      const obj = { val: c.charCodeAt(0) };
      sum += obj.val;
    }
  }
  return sum;
}