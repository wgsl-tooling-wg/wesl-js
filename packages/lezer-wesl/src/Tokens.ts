/** External tokenizers and specializers referenced by wesl.grammar. */

import { ExternalTokenizer, type Stack } from "@lezer/lr";
import { stdFns, stdTypes, WeslStream } from "wesl";
import {
  BuiltinFn,
  BuiltinType,
  templateArgsEndFallback,
  templateCallStart,
} from "./parser.terms.js";

/** Stack with internal parse state for accessing source text. */
interface StackWithParse extends Stack {
  p: { input: { string: string } };
}

/** Fallback tokenizer for nested template closing. Emits single '>' when '>>' seen in template context. */
export const fallback = new ExternalTokenizer(
  input => {
    if (input.next === 62 && input.peek(1) === 62) {
      input.acceptToken(templateArgsEndFallback, 1);
    }
  },
  { extend: true },
);

const builtinTypeSet = new Set(stdTypes);
const builtinFnSet = new Set(stdFns);

/** External extend function for template call start. Returns templateCallStart if '<' starts a template. */
export function templateCallExtend(
  value: string,
  stack: StackWithParse,
): number {
  if (value !== "<") return -1;

  const text = stack.p.input.string.slice(stack.pos);
  const stream = new WeslStream(text);
  return stream.nextTemplateStartToken() !== null ? templateCallStart : -1;
}

/** Specialize identifiers that match WGSL built-in types or functions. */
export function builtinSpecialize(value: string): number {
  if (builtinTypeSet.has(value)) return BuiltinType;
  if (builtinFnSet.has(value)) return BuiltinFn;
  return -1;
}
