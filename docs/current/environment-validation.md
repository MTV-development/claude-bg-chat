# GTD Todo Manager - Environment Validation

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## Overview

Before starting implementation work, verify the codebase is healthy by running the validation checks described below. This ensures you're building on a stable foundation.

## Pre-flight Commands

Run these three commands to validate the environment:

```bash
# 1. Build check - ensures production build works
npm run build

# 2. Full type check - catches ALL TypeScript errors including test files
npx tsc --noEmit

# 3. Test suite - ensures tests pass
npm test
```

## Expected Results

| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

## Known Issues

No known issues at this time. All validation checks should pass.

## Testing Structure

The project uses Jest for testing, with test files organized as follows:

```
scripts/gtd/__tests__/
├── store.test.ts         # Data layer tests
├── commands.test.ts      # CLI command tests
└── migration.test.ts     # Schema migration tests

components/__tests__/
├── ThemeToggle.test.tsx  # Component tests (React Testing Library)
```

## Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Important: Jest vs TypeScript

Jest uses Babel for transpilation, which means **TypeScript errors in test files won't cause test failures**. A test file can have type errors but still pass all tests. Always run the full type check (`npx tsc --noEmit`) to catch these issues.

## Related Documentation

- [Overview](./overview.md) - Project introduction
- [High-Level Concept](./high-level-concept.md) - GTD workflow design
- [Data Model](./data-model.md) - Data structures and storage
- [Technical Architecture](./technical-architecture.md) - System components and interactions
