/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "prettier",
  ],
  globals: {
    shopify: "readonly"
  },
  overrides: [
    {
      files: ["app/tests/**/*.js", "app/tests/**/*.jsx"],
      extends: ["@remix-run/eslint-config/jest-testing-library"],
      // You might not need to re-declare 'env: { jest: true }' if the extend does it.
      // However, it can be added explicitly if needed:
      // env: {
      //   jest: true,
      // },
    },
  ],
};
