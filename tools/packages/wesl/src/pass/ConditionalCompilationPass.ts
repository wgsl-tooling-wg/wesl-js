import type {
  AttributeElem,
  GlobalDeclarationElem,
  IfAttribute,
  ModuleElem,
  FunctionDeclarationElem,
  Statement,
  CompoundStatement,
} from "../parse/WeslElems";
import { PT } from "../parse/BaseGrammar.ts";
import { Conditions, evaluateConditions } from "../Conditions.ts";
import { DirectiveElem } from "../parse/DirectiveElem.ts";

/**
 * Done as a separate pass for now, since the alternative means more code duplication.
 * Can be merged when we merge passes.
 */
export function applyConditionalCompilation(
  module: ModuleElem<PT>,
  conditions: Conditions,
): ModuleElem<PT> {
  const directives = new LazyArray(module.directives);
  for (const directive of module.directives) {
    const condResult = condAttributedElement(conditions, directive);
    if (condResult === null) {
      directives.skip();
    } else {
      directives.push(condResult);
    }
  }
  const declarations = new LazyArray(module.declarations);
  for (const declaration of module.declarations) {
    const condResult = condAttributedElement(conditions, declaration);
    if (condResult === null) {
      declarations.skip();
    } else if (condResult.kind === "function") {
      declarations.push(condFunction(conditions, condResult));
    } else {
      declarations.push(condResult);
    }
  }

  return lazyUpdate(module, {
    directives: directives.finish(),
    declarations: declarations.finish(),
  });
}

/** An array that skips doing work unless we actually deviate from the original result. */
class LazyArray<T> {
  private newArray: T[] | { length: number } = { length: 0 };
  constructor(public original: T[]) {}
  skip() {
    // Okay, now we have a mutated array
    this.newArray = this.original.slice(0, this.newArray.length);
    this.skip = () => {};
  }
  push(elem: T) {
    if (this.original[this.newArray.length] === elem) {
      this.newArray.length += 1;
    } else {
      // Okay, now we have a mutated array
      const newArray = this.original.slice(0, this.newArray.length);
      newArray.push(elem);
      this.newArray = newArray;
      this.push = (elem: T) => {
        newArray.push(elem);
      };
    }
  }
  finish(): T[] {
    if (Array.isArray(this.newArray)) {
      return this.newArray;
    } else if (this.newArray.length === this.original.length) {
      return this.original;
    } else {
      throw new Error(
        "Not enough elements were inputted into the lazy array. Did you forget to call .skip()?",
      );
    }
  }
}

/** Updates object properties if anything has changed. */
function lazyUpdate<T>(obj: T, update: Partial<T>): T {
  let anyChanges = Object.entries(update).some(
    ([key, value]) => obj[key as keyof T] !== value,
  );
  if (anyChanges) {
    return {
      ...obj,
      update,
    };
  } else {
    return obj;
  }
}

/**
 * Does conditional compilation allow the next element to be included.
 * Filters out the conditional compilation attributes as well.
 */
function condAttributedElement<T extends { attributes?: AttributeElem<PT>[] }>(
  conditions: Conditions,
  attributedElem: T,
): T | null {
  const attributes = attributedElem.attributes;
  if (attributes === undefined) return attributedElem;

  const condAttribute = attributes.find(v => v.attribute.kind === "@if");
  if (condAttribute === undefined) return attributedElem;

  if (evaluateConditions(conditions, condAttribute.attribute as IfAttribute)) {
    return {
      ...attributedElem,
      attributes: attributes.filter(v => v.attribute.kind !== "@if"),
    };
  } else {
    return null;
  }
}

function condFunction(
  conditions: Conditions,
  decl: FunctionDeclarationElem<PT>,
): FunctionDeclarationElem<PT> {
  const params = new LazyArray(decl.params);
  for (const param of decl.params) {
    const condResult = condAttributedElement(conditions, param);
    if (condResult === null) {
      params.skip();
    } else {
      params.push(condResult);
    }
  }

  const bodyStatements = new LazyArray(decl.body.body);
  for (const statement of decl.body.body) {
    const condResult = condAttributedElement(conditions, statement);
    if (condResult === null) {
      bodyStatements.skip();
    } else {
      bodyStatements.push(condStatement(conditions, condResult));
    }
  }

  return lazyUpdate(decl, {
    params: params.finish(),
    body: lazyUpdate(decl.body, {
      body: bodyStatements.finish(),
    }),
  });
}

function condStatement(
  conditions: Conditions,
  statement: Statement<PT>,
): Statement<PT> {
  if (statement.kind === "compound-statement") {
    return condCompoundStatement(conditions, statement);
  } else if (statement.kind === "for-statement") {
    return lazyUpdate(statement, {
      initializer:
        statement.initializer !== undefined ?
          (condStatement(
            conditions,
            statement.initializer,
          ) satisfies Statement<PT> as any)
        : undefined,
      update:
        statement.update !== undefined ?
          (condStatement(
            conditions,
            statement.update,
          ) satisfies Statement<PT> as any)
        : undefined,
      body: condCompoundStatement(conditions, statement.body),
    });
  } else if (statement.kind === "if-else-statement") {
    // TODO: Hmm
  } else if (statement.kind === "loop-statement") {
    return lazyUpdate(statement, {
      body: condCompoundStatement(conditions, statement.body),
    });
  } else if (statement.kind === "switch-statement") {
    // TODO: Hmm
  } else if (statement.kind === "while-statement") {
    return lazyUpdate(statement, {
      body: condCompoundStatement(conditions, statement.body),
    });
  } else {
    return statement;
  }
}

function condCompoundStatement(
  conditions: Conditions,
  statement: CompoundStatement<PT>,
): CompoundStatement<PT> {
  const bodyStatements = new LazyArray(statement.body);
  for (const innerStatement of statement.body) {
    const condResult = condAttributedElement(conditions, innerStatement);
    if (condResult === null) {
      bodyStatements.skip();
    } else {
      bodyStatements.push(condStatement(conditions, condResult));
    }
  }
  return lazyUpdate(statement, {
    body: bodyStatements.finish(),
  });
}
