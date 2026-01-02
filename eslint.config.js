import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "uploads/**",
      "dist/**",
      ".env"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn",
      "semi": ["error", "always"]
    }
  },
  
  {
    files: ["public/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  js.configs.recommended
]);
