/// <reference lib="deno.unstable" />
const plugin: Deno.lint.Plugin = {
  name: "expect-snapshot-plugin",
  rules: {
    "expect-snapshot": {
      create(context) {
        return {
          "CallExpression"(
            node,
          ) {
            // :where(> MemberExpression[property.name=/toMatchSnapshot|toMatchInlineSnapshot/] > CallExpression[callee.name=/expect/])
            if (
              node.callee.type === "MemberExpression" &&
              node.callee.property.type === "Identifier" &&
              (node.callee.property.name === "toMatchSnapshot" ||
                node.callee.property.name === "toMatchInlineSnapshot") &&
              node.callee.object.type === "CallExpression"
            ) {
              const expectFn = node.callee.object;
              context.report({
                node,
                message: "Rewrite Jest snapshots to Deno",
                fix(fixer) {
                  const inner = context.sourceCode.getText(
                    expectFn.arguments[0],
                  );
                  return fixer.replaceText(
                    node,
                    `await assertSnapshot(t, ${inner});`,
                  );
                },
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
