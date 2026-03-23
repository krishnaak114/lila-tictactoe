/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Use the dedicated test tsconfig so VS Code + ts-jest share the same
        // setup (CommonJS modules, jest types) — separate from the outFile
        // script-concatenation config used for production.
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
};
