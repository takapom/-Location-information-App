module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|@testing-library/react-native|expo|expo-router|@expo|react-native-safe-area-context)/)"
  ],
  watchman: false,
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@react-native-async-storage/async-storage$": "<rootDir>/jest/asyncStorageMock.js",
    "^@terri/shared$": "<rootDir>/../../packages/shared/src"
  }
};
