export function toRegexSource(nameExp: [string, RegExp | string]): string {
  const [name, e] = nameExp;
  if (typeof e === "string") {
    const expSrc = `(${escapeRegex(e)})`;
    verifyNonCapturing(name, new RegExp(expSrc));
    return expSrc;
  } else {
    verifyNonCapturing(name, e);
    return `(${e.source})`;
  }
}

function verifyNonCapturing(name: string, exp: RegExp): void {
  const willMatch = new RegExp("|" + exp.source);
  const result = willMatch.exec("")!;
  if (result.length > 1) {
    throw new Error(
      `match expression groups must be non-capturing: ${name}: /${exp.source}/. Use (?:...) instead.`,
    );
  }
}

const regexSpecials = /[$+*.?|(){}[\]\\/^]/g;

function escapeRegex(s: string): string {
  return s.replace(regexSpecials, "\\$&");
}

/**
 * @return a regexp to match any of the space separated tokens in the provided string.
 * Regex special characters are escaped, and the matchers are sorted by length
 * so that longer matches are preferred.
 */
export function matchOneOf(syms: string): RegExp {
  const symbolList = syms.split(/\s+/).sort((a, b) => b.length - a.length);
  const escaped = symbolList.filter(s => s).map(escapeRegex);
  return new RegExp(escaped.join("|"));
}
