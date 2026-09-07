import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// eslint-config-next 16 ships flat config directly, so no FlatCompat shim is needed.
const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  prettier,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
