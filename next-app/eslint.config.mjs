import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Keep existing legacy debt visible while allowing ESLint to become a
    // repeatable CI gate. New code should not add any of these warnings.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
    },
  },
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];

export default eslintConfig;
