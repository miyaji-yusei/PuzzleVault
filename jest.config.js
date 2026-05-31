module.exports = {
  projects: [
    {
      displayName: 'engines',
      testMatch: ['<rootDir>/src/engines/**/__tests__/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'js'],
    },
    {
      displayName: 'app',
      testMatch: ['<rootDir>/app/**/__tests__/**/*.test.tsx', '<rootDir>/src/**/__tests__/**/*.test.tsx'],
      preset: 'jest-expo',
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    },
  ],
  collectCoverageFrom: ['src/engines/**/*.ts'],
}
