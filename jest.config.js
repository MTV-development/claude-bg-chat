/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // GTD scripts - Node environment
    {
      displayName: 'gtd',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/scripts/gtd'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
    // React components - jsdom environment
    {
      displayName: 'react',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/lib', '<rootDir>/components'],
      testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'scripts/gtd/**/*.ts',
    'lib/**/*.ts',
    'lib/**/*.tsx',
    'components/**/*.tsx',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/__tests__/**',
  ],
  verbose: true,
};
