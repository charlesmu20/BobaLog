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
    // Cloud Functions是獨立的子專案(自己的package.json/tsconfig.json),
    // 用firebase deploy部署,不是Next.js app的一部分,不用跟著這裡的規則檢查
    "functions/**",
  ]),
]);

export default eslintConfig;
