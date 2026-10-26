import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // A link to a page of the site carries the page's language prefix; LocaleLink adds it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/LocaleLink.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message: "Link through LocaleLink (components/ui/LocaleLink), which adds the page's language prefix.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
