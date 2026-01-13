# GTD Todo Manager - Environment Validation

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## Overview

Before starting implementation work, verify the codebase is healthy by running the validation checks described below. This ensures you're building on a stable foundation.

## Pre-flight Commands

Run these three commands to validate the environment:

```bash
# 1. Build check - ensures production build works (requires env vars)
npm run build

# 2. Full type check - catches ALL TypeScript errors
npx tsc --noEmit

# 3. Test suite - ensures tests pass
npm test
```

## Expected Results

| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors (requires DATABASE_URL) |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

## Known Issues

**Build requires environment variables**: The Next.js build requires `DATABASE_URL` to be set because API routes compile at build time and need database connection strings. If you don't have credentials, use `npx tsc --noEmit` for type checking instead.

## Testing Structure

The project uses Jest for testing, with test files organized as follows:

```
lib/__tests__/
├── stores/
│   └── selectors.test.ts    # Zustand selector tests
└── ...

components/__tests__/
├── ThemeToggle.test.tsx     # Component tests (React Testing Library)
├── ThemeContext.test.tsx    # Theme context tests
└── ...
```

## Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Running E2E Tests

```bash
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Run with Playwright UI
```

See [E2E Testing](./e2e-testing.md) for detailed E2E testing documentation.

## Important: Jest vs TypeScript

Jest uses Babel for transpilation, which means **TypeScript errors in test files won't cause test failures**. A test file can have type errors but still pass all tests. Always run the full type check (`npx tsc --noEmit`) to catch these issues.

## Related Documentation

- [Overview](./overview.md) - Project introduction
- [High-Level Concept](./high-level-concept.md) - GTD workflow design
- [Data Model](./data-model.md) - Data structures and storage
- [Technical Architecture](./technical-architecture.md) - System components and interactions
