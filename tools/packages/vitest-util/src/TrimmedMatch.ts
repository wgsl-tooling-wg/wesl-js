import { expect } from "vitest";

/** @return trimmed source for test comparisons */
export function trimSrc(src: string): string {
  const rawLines = src.split("\n");
  const trimmed = rawLines.map(l => l.trim());
  const nonBlank = trimmed.filter(l => l !== "");

  return nonBlank.join("\n");
}

/** Assert match between trimmed strings */
export function expectTrimmedMatch(result: string, expected: string): void {
  const resultTrimmed = trimSrc(result);
  const expectTrimmed = trimSrc(expected);
  if (resultTrimmed !== expectTrimmed) {
    const expectLines = expectTrimmed.split("\n");
    const resultLines = resultTrimmed.split("\n");
    const len = Math.max(expectLines.length, resultLines.length);
    for (let i = 0; i < len; i++) {
      const diff = expectLines[i] !== resultLines[i];
      if (diff) {
        console.log(`...failed.  Line ${i + 1} differs:
  expected: ${expectLines[i]}
    actual: ${resultLines[i] ?? ""}`);
        break;
      }
    }
    console.log(
      `\ntrimmed result:\n${resultTrimmed}\n\ntrimmed expected:\n${expectTrimmed}\n`,
    );
  }
  expect(resultTrimmed).toBe(expectTrimmed);
}
