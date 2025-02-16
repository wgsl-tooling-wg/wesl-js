import { assertUnreachable } from "../../../mini-parse/src/Assertions.ts";
import {
  AbstractElem,
  Attribute,
  DiagnosticDirective,
  EnableDirective,
  FnElem,
  RequiresDirective,
  StuffElem,
  TypedDeclElem,
  TypeRefElem,
  TypeTemplateParameter,
  UnknownExpressionElem,
} from "../AbstractElems.ts";
import {
  diagnosticControlToString,
  expressionToString,
} from "../LowerAndEmit.ts";
import { importToString } from "./ImportToString.ts";
import { LineWrapper } from "./LineWrapper.ts";

const maxLineLength = 150;

export function astToString(elem: AbstractElem, indent = 0): string {
  const { kind } = elem;
  const str = new LineWrapper(indent, maxLineLength);
  str.add(kind);
  addElemFields(elem, str);
  let childStrings: string[] = [];
  if ("contents" in elem) {
    childStrings = elem.contents.map(e => astToString(e, indent + 2));
  }
  if (childStrings.length) {
    str.nl();
    str.addBlock(childStrings.join("\n"), false);
  }

  return str.result;
}

function addElemFields(elem: AbstractElem, str: LineWrapper): void {
  const { kind } = elem;
  if (kind === "text") {
    const { srcModule, start, end } = elem;
    str.add(` '${srcModule.src.slice(start, end)}'`);
  } else if (
    kind === "var" ||
    kind === "let" ||
    kind === "gvar" ||
    kind === "const" ||
    kind === "override"
  ) {
    addTypedDeclIdent(elem.name, str);
  } else if (kind === "struct") {
    str.add(" " + elem.name.ident.originalName);
  } else if (kind === "member") {
    const { name, typeRef, attributes } = elem;
    if (attributes) {
      for (const attribute of attributes) {
        addAttribute(attribute.attribute, str);
      }
    }
    str.add(" " + name.name);
    str.add(": " + typeRefElemToString(typeRef));
  } else if (kind === "name") {
    str.add(" " + elem.name);
  } else if (kind === "memberRef") {
    const { extraComponents } = elem;
    const extraText =
      extraComponents ? debugContentsToString(extraComponents) : "";
    str.add(` ${elem.name.ident.originalName}.${elem.member.name}${extraText}`);
  } else if (kind === "fn") {
    addFnFields(elem, str);
  } else if (kind === "alias") {
    const { name, typeRef } = elem;
    const prefix = name.ident.kind === "decl" ? "%" : "";
    str.add(" " + prefix + name.ident.originalName);
    str.add("=" + typeRefElemToString(typeRef));
  } else if (kind === "attribute") {
    addAttribute(elem.attribute, str);
  } else if (kind === "expression") {
    const contents = elem.contents
      .map(e => {
        if (e.kind === "text") {
          return "'" + e.srcModule.src.slice(e.start, e.end) + "'";
        } else {
          return astToString(e);
        }
      })
      .join(" ");
    str.add(" " + contents);
  } else if (kind === "type") {
    const { name } = elem;
    const nameStr = typeof name === "string" ? name : name.originalName;
    str.add(" " + nameStr);

    if (elem.templateParams !== undefined) {
      const paramStrs = elem.templateParams
        .map(templateParamToString)
        .join(", ");
      str.add("<" + paramStrs + ">");
    }
  } else if (kind === "synthetic") {
    str.add(` '${elem.text}'`);
  } else if (kind === "import") {
    str.add(" " + importToString(elem.imports));
  } else if (kind === "ref") {
    str.add(" " + elem.ident.originalName);
  } else if (kind === "typeDecl") {
    addTypedDeclIdent(elem, str);
  } else if (kind === "decl") {
    const { ident } = elem;
    str.add(" %" + ident.originalName);
  } else if (kind === "assert") {
    // Nothing to do for now
  } else if (kind === "module") {
    // Ignore this kind of elem
  } else if (kind === "param") {
    // TODO: This branch shouldn't exist
  } else if (kind === "stuff") {
    // Ignore
  } else if (kind === "directive") {
    addDirective(elem.directive, str);
  } else {
    assertUnreachable(kind);
  }
}

function addAttribute(elem: Attribute, str: LineWrapper) {
  const { kind } = elem;
  if (kind === "attribute") {
    const { name, params } = elem;
    str.add(" @" + name);
    if (params.length > 0) {
      str.add("(");
      str.add(params.map(unknownExpressionToString).join(", "));
      str.add(")");
    }
  } else if (kind === "builtin") {
    str.add(` @builtin(${elem.param.name})`);
  } else if (kind === "diagnostic") {
    str.add(
      ` @diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`,
    );
  } else if (kind === "if") {
    str.add(" @if");
    str.add("(");
    str.add(expressionToString(elem.param.expression));
    str.add(")");
  } else if (kind === "interpolate") {
    str.add(` @interpolate(${elem.params.map(v => v.name).join(", ")})`);
  } else {
    assertUnreachable(kind);
  }
}

function addTypedDeclIdent(elem: TypedDeclElem, str: LineWrapper) {
  const { decl, typeRef } = elem;
  str.add(" %" + decl.ident.originalName);
  if (typeRef) {
    str.add(" : " + typeRefElemToString(typeRef));
  }
}

function addFnFields(elem: FnElem, str: LineWrapper) {
  const { name, params, returnType, fnAttributes } = elem;

  str.add(" " + name.ident.originalName);

  str.add("(");
  const paramStrs = params
    .map(
      (
        p, // TODO DRY
      ) => {
        const { name } = p;
        const { originalName } = name.decl.ident;
        const typeRef = typeRefElemToString(name.typeRef!);
        return originalName + ": " + typeRef;
      },
    )
    .join(", ");
  str.add(paramStrs);
  str.add(")");

  fnAttributes?.forEach(a => addAttribute(a.attribute, str));

  if (returnType) {
    str.add(" -> " + typeRefElemToString(returnType));
  }
}

function addDirective(
  elem: DiagnosticDirective | EnableDirective | RequiresDirective,
  str: LineWrapper,
) {
  const { kind } = elem;
  if (kind === "diagnostic") {
    str.add(
      ` diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`,
    );
  } else if (kind === "enable") {
    str.add(` enable ${elem.extensions.map(v => v.name).join(", ")}`);
  } else if (kind === "requires") {
    str.add(` requires${elem.extensions.map(v => v.name).join(", ")}`);
  } else {
    assertUnreachable(kind);
  }
}

function unknownExpressionToString(elem: UnknownExpressionElem): string {
  // TODO: Temp hack while I clean up the expression parsing
  if ("contents" in elem) {
    // @ts-ignore
    const contents = elem.contents
      // @ts-ignore
      .map(e => {
        if (e.kind === "text") {
          return "'" + e.srcModule.src.slice(e.start, e.end) + "'";
        } else {
          return astToString(e);
        }
      })
      .join(" ");
    return contents;
  }
  return astToString(elem);
}

function templateParamToString(p: TypeTemplateParameter): string {
  if (typeof p === "string") {
    return p;
  } else if (p.kind === "type") {
    return typeRefElemToString(p);
  } else if (p.kind === "expression") {
    return unknownExpressionToString(p);
  } else {
    console.log("unknown template parameter type", p);
    return "??";
  }
}

function typeRefElemToString(elem: TypeRefElem): string {
  if (!elem) return "?type?";
  const { name } = elem;
  const nameStr = typeof name === "string" ? name : name.originalName;

  let params = "";
  if (elem.templateParams !== undefined) {
    const paramStrs = elem.templateParams.map(templateParamToString).join(", ");
    params = "<" + paramStrs + ">";
  }
  return nameStr + params;
}

export function debugContentsToString(elem: StuffElem): string {
  const parts = elem.contents.map(c => {
    const { kind } = c;
    if (kind === "text") {
      return c.srcModule.src.slice(c.start, c.end);
    } else if (kind === "ref") {
      return c.ident.originalName; // not using the mapped to decl name, so this can be used for debug..
    } else {
      return `?${c.kind}?`;
    }
  });
  return parts.join(" ");
}
