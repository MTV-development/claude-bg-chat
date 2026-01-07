/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts/gtd'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'scripts/gtd/**/*.ts',
    '!scripts/gtd/**/*.test.ts',
    '!scripts/gtd/__tests__/**',
  ],
  verbose: true,
};
