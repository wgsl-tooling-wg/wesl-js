import type {
  AttributeElem,
  IfAttribute,
  ModuleElem,
  FunctionDeclarationElem,
  Statement,
  CompoundStatement,
  IfClause,
  SwitchClause,
} from "../parse/WeslElems";
import { Conditions, evaluateConditions } from "../Conditions.ts";
import { assertThat } from "../Assertions.ts";

/**
 * TODO: Purposefully unused, I want to see how bad *not* using this would be.
 *
 * Mutates the AST to skip conditional compilation elements.
 * Done as a separate pass for now, since the alternative means more code duplication.
 * - The symbols table needs it
 * - The binding structs need it
 * - The emitting needs it
 * Can be merged when we merge passes.
 */
export function applyConditionalCompilation(
  module: ModuleElem,
  conditions: Conditions,
): ModuleElem {
  // Filter with side effects
  module.directives = module.directives.filter(v =>
    condAttributedElement(conditions, v),
  );
  module.declarations = module.declarations.filter(v =>
    condAttributedElement(conditions, v),
  );
  module.declarations.forEach(v => {
    if (v.kind === "function") {
      condFunction(conditions, v);
    }
  });
  return module;
}

/**
 * Does conditional compilation allow the next element to be included.
 * Filters out the conditional compilation attributes as well.
 * Mutates the element.
 */
function condAttributedElement<T extends { attributes?: AttributeElem[] }>(
  conditions: Conditions,
  attributedElem: T,
): boolean {
  const attributes = attributedElem.attributes;
  if (attributes === undefined) return true;

  const condAttribute = attributes.find(v => v.attribute.kind === "@if");
  if (condAttribute === undefined) return true;

  if (evaluateConditions(conditions, condAttribute.attribute as IfAttribute)) {
    attributedElem.attributes = attributes.filter(
      v => v.attribute.kind !== "@if",
    );
    assertThat(
      attributedElem.attributes.length === attributes.length - 1,
      "Multiple @ifs are not allowed",
    );
    return true;
  } else {
    return false;
  }
}

function condFunction(conditions: Conditions, decl: FunctionDeclarationElem) {
  decl.params = decl.params.filter(v => condAttributedElement(conditions, v));
  decl.body.body = decl.body.body.filter(v =>
    condAttributedElement(conditions, v),
  );
  decl.body.body.forEach(v => condStatement(conditions, v));
}

function condStatement(conditions: Conditions, statement: Statement) {
  if (statement.kind === "compound-statement") {
    condCompoundStatement(conditions, statement);
  } else if (statement.kind === "for-statement") {
    if (statement.initializer !== undefined) {
      if (condAttributedElement(conditions, statement.initializer) === false) {
        statement.initializer = undefined;
      }
    }
    if (statement.update !== undefined) {
      if (condAttributedElement(conditions, statement.update) === false) {
        statement.update = undefined;
      }
    }
    condCompoundStatement(conditions, statement.body);
  } else if (statement.kind === "if-else-statement") {
    condIfClause(conditions, statement.main);
  } else if (statement.kind === "loop-statement") {
    condCompoundStatement(conditions, statement.body);
  } else if (statement.kind === "switch-statement") {
    statement.clauses = statement.clauses.filter(v =>
      condAttributedElement(conditions, v),
    );
    statement.clauses.forEach(v => condSwitchClause(conditions, v));
  } else if (statement.kind === "while-statement") {
    condCompoundStatement(conditions, statement.body);
  } else {
    return statement;
  }
}

function condCompoundStatement(
  conditions: Conditions,
  statement: CompoundStatement,
) {
  statement.body = statement.body.filter(v =>
    condAttributedElement(conditions, v),
  );
  statement.body.forEach(v => condStatement(conditions, v));
}
function condIfClause(conditions: Conditions, clause: IfClause) {
  condStatement(conditions, clause.accept);
  if (clause.reject !== undefined) {
    if (clause.reject.kind === "compound-statement") {
      condStatement(conditions, clause.reject);
    } else {
      condIfClause(conditions, clause.reject);
    }
  }
}

function condSwitchClause(conditions: Conditions, clause: SwitchClause): void {
  condStatement(conditions, clause.body);
}
