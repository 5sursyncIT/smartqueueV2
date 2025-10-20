import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Allow unescaped entities for French apostrophes
      "react/no-unescaped-entities": "off",
      // Warn on unused vars instead of error
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // Allow empty interfaces (for extending types)
      "@typescript-eslint/no-empty-object-type": "off",
      // Warn on explicit any instead of error (allow when necessary for error handling)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
