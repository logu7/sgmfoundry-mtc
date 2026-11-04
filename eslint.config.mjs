import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worker artefacts
    ".wrangler/**",
    "worker-configuration.d.ts",
  ]),
  {
    rules: {
      // Certificates live in IndexedDB: every screen has to load an external
      // store on mount and push the result into state. That is exactly the
      // external-system sync an effect is for, so this compiler heuristic
      // (aimed at derived state) is off for this app.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
