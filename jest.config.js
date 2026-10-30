

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config', '<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^edge-js$': '<rootDir>/test/mocks/edge-js.js',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@class/(.*)$': '<rootDir>/src/class/$1',
    '^@osu/(.*)$': '<rootDir>/src/class/api/osu/$1',
    '^@database/(.*)$': '<rootDir>/src/class/database/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
  },
  transform: {
    '^.+\\.(tsx?|jsx?)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        moduleResolution: 'node',
        allowJs: true,
      }
    }]
  },
  // p-queue and p-timeout ship ESM only. pnpm nests them under node_modules/.pnpm.
  transformIgnorePatterns: [
    '/node_modules/(?!(?:\\.pnpm/(?:p-queue|p-timeout)@|(?:p-queue|p-timeout)/))',
  ],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts'
  ]
};


