import {FlatCompat} from "@eslint/eslintrc";
import prettier from "eslint-plugin-prettier/recommended";

const compat = new FlatCompat();

export default [
  ...compat.extends("standard-with-typescript").map((config) => {
    for (const rule of Object.keys(config.rules ?? {})) {
      if (rule.startsWith("@typescript-eslint/")) {
        config.files = ["**/*.ts", "**/*.mts", "**/*.tsx"];
        break;
      }
    }
    return config;
  }),
  {
    rules: {
      // REASON: Readability.
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          "alphabetize": {order: "asc"},
        },
      ],
      // REASON: Ensures that we don't have to worry about circular
      // dependencies.
      "import/no-cycle": "error",
      // REASON: Default exports are difficult to import correctly.
      "import/no-default-export": "error",
      // REASON: import/extensions doesn't work with `exports` yet, but we still
      // want extensions for everything else.
      "import/extensions": ["error", "ignorePackages"],
      // REASON: More readable.
      "curly": ["error", "all"],
    },
  },
  {
    files: ["**/*.ts", "**/*.mts", "**/*.tsx"],
    rules: {
      // REASON: Conflicts with @typescript-eslint/strict-boolean-expressions.
      "no-extra-boolean-cast": "off",
      // REASON: @typescript-eslint/explicit-module-boundary-types takes care of
      // this for functions that actually matter. This rule is too noisy for
      // local functions.
      "@typescript-eslint/explicit-function-return-type": "off",
      // REASON: This ensures a kind of contract between the caller and the
      // module.
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // REASON: We use a `bound` decorator instead of arrows.
      "@typescript-eslint/unbound-method": "off",
      // REASON: We use index signatures for dynamic properties.
      "@typescript-eslint/dot-notation": [
        "error",
        {allowIndexSignaturePropertyAccess: true},
      ],
    },
  },
  {
    files: ["**/*.config.{js,ts,mts,mjs}"],
    rules: {
      // REASON: Usually configs use default exports.
      "import/no-default-export": "off",
    },
  },
  prettier,
];
