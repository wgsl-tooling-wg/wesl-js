import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["**/dist/", "**/bin/"] },
  { rules: { 
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "warn",
   } 
  },
  {
    files: ["*.js", "**/scripts/*.m?[jt]s"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  }
);
