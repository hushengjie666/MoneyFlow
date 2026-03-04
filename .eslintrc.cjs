module.exports = {
  root: true,
  env: {
    browser: true,
    es2023: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  globals: {
    document: "readonly",
    window: "readonly",
    fetch: "readonly",
    URL: "readonly",
    URLSearchParams: "readonly",
    setInterval: "readonly",
    clearInterval: "readonly"
  },
  extends: ["eslint:recommended"],
  ignorePatterns: ["frontend/public/**"],
  rules: {
    "no-console": "off"
  }
};
