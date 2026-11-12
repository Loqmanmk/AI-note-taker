const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    settings: {
      // "@shared/*" points at ../lib, which the import plugin cannot follow by itself.
      "import/ignore": ["@shared/"],
    },
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^@shared/"] }],
      // This rule cannot parse react-native's own source; TypeScript already checks imports.
      "import/namespace": "off",
    },
  },
]);
