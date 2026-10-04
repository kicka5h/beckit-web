// Every rule here enforces a line of CONTRIBUTING.md or STYLE.md. Change both together.
import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const readability = {
  complexity: ["error", 10],
  "max-depth": ["error", 3],
  "max-params": ["error", 4],
  "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
  "sonarjs/cognitive-complexity": ["error", 12],
  "no-nested-ternary": "error",
};

const dontRepeatYourself = {
  "sonarjs/no-identical-functions": "error",
  "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
};

const files = {
  "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
};

const naming = {
  "id-length": ["error", { min: 2, exceptions: ["a", "b"], properties: "never" }],
  "@typescript-eslint/naming-convention": [
    "error",
    { selector: "default", format: ["camelCase"] },
    {
      selector: "variable",
      modifiers: ["const", "global"],
      format: ["camelCase", "UPPER_CASE", "PascalCase"],
    },
    { selector: "function", format: ["camelCase", "PascalCase"] },
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: "variable",
      types: ["boolean"],
      format: ["PascalCase"],
      prefix: ["is", "has", "should", "can"],
    },
    {
      selector: "parameter",
      modifiers: ["unused"],
      format: ["camelCase"],
      leadingUnderscore: "require",
    },
    { selector: "import", format: ["camelCase", "PascalCase"] },
    { selector: ["objectLiteralProperty", "typeProperty"], format: null },
  ],
};

const valuesAndFunctions = {
  "prefer-const": "error",
  "no-var": "error",
  "one-var": ["error", "never"],
  "no-undef-init": "error",
  "unicorn/no-null": "error",
  "func-style": ["error", "declaration"],
  "@typescript-eslint/explicit-function-return-type": [
    "error",
    { allowExpressions: true, allowTypedFunctionExpressions: true },
  ],
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "unicorn/no-for-each": "error",
  "object-shorthand": "error",
  "prefer-template": "error",
  eqeqeq: "error",
  curly: ["error", "multi-line"],
};

const imports = {
  // External packages, then @beckit/*, then relative paths; side-effect imports (CSS) last.
  "simple-import-sort/imports": [
    "error",
    { groups: [["^@?(?!beckit/)\\w"], ["^@beckit/"], ["^\\."], ["^\\u0000"]] },
  ],
  "simple-import-sort/exports": "error",
};

const types = {
  "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
  "@typescript-eslint/consistent-type-imports": "error",
};

const comments = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      publicOnly: true,
      checkConstructors: false,
      require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: true },
      contexts: [
        "TSInterfaceDeclaration",
        "TSTypeAliasDeclaration",
        "ExportNamedDeclaration > VariableDeclaration",
      ],
    },
  ],
  "no-warning-comments": ["error", { terms: ["fixme", "xxx", "hack"] }],
};

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/temp/**", "**/*.config.*"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "simple-import-sort": simpleImportSort, unicorn, jsdoc },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...readability,
      ...dontRepeatYourself,
      ...files,
      ...naming,
      ...valuesAndFunctions,
      ...imports,
      ...types,
      ...comments,
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/bench/**"],
    rules: {
      "max-lines-per-function": "off",
      "sonarjs/no-duplicate-string": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
);
