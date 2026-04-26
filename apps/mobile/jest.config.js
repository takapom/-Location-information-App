module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  setupFiles: ["react-native/jest/setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|@testing-library/react-native|expo|expo-router|@expo|react-native-safe-area-context)/)"
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  watchman: false,
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@terri/shared$": "<rootDir>/../../packages/shared/src"
  }
};
