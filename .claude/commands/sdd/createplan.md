---
description: Create a detailed implementation plan from a specification
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS

## Your Task

You are creating a detailed, phased implementation plan from a specification document. The plan must be structured for trackable progress with automatic testability at each phase.

### Step 1: Locate the Spec File

Specs live in subdirectories of `/docs/` following the pattern:
`/docs/<date>-<hex>-<project-name>/<date>-<hex>-<project-name>-spec.md`

If no spec file path was provided (`$ARGUMENTS` is empty):

1. List available spec directories in `/docs/` (folders matching `*-*-*-*/`)
2. Look for `*-spec.md` files within those directories
3. Ask the user which spec to use:
   > Which specification would you like me to create a plan for? [list the available specs]

### Step 2: Validate Spec Readiness

Before creating a plan, verify the spec is ready:
- Status should be "Ready for Implementation" (not "Draft" or "Needs Revision")
- No unresolved critical issues
- No unanswered open questions that block implementation

If the spec isn't ready, inform the user:
> This spec has status "[status]". Run `/sdd:checkspec` first to validate it before creating an implementation plan.

### Step 3: Analyze Implementation Scope

Read the spec thoroughly and explore the codebase to understand:

1. **Change Footprint**: Which files need modification? Which need creation?
2. **Dependencies**: What order must changes happen in?
3. **Risk Areas**: Which changes are most likely to cause issues?
4. **Test Points**: Where can we verify correctness automatically?

### Step 4: Design the Phase Structure

Break the implementation into **phases** (P1, P2, P3...) where each phase:
- Is a coherent unit of work (2-8 subtasks)
- Has a clear, testable completion criteria
- Can be verified before moving to the next phase
- Builds on previous phases

Within each phase, define **subtasks** (P1.1, P1.2, P1.3...) where each subtask:
- Is atomic (can be completed in one focused session)
- Has explicit acceptance criteria
- Specifies the files to modify
- Notes any automatic tests to run or create

### Step 5: Create the Plan Document

Create the plan file at:
`/docs/<spec-directory>/<spec-prefix>-plan.md`

Use this structure:

```markdown
# Implementation Plan: <Project Name>

**Spec:** <link to spec file>
**Created:** <today's date>
**Status:** Not Started

## Overview

[1-2 sentence summary of what will be implemented]

## Test Strategy

[How will each phase be verified? What test commands to run?]

**Verification Commands:**
```bash
# Build check
npm run build

# Type check
npm run typecheck

# Unit tests
npm test

# E2E tests (if applicable)
npm run test:e2e
```

---

## Phase 1: <Phase Title>

**Goal:** [What this phase accomplishes]
**Verification:** [How to confirm phase is complete - specific test command or manual check]

### P1.1: <Subtask Title>

**Files:** `path/to/file.ts`
**Changes:** [Specific changes to make]
**Acceptance:** [How to verify this subtask is done]

### P1.2: <Subtask Title>

**Files:** `path/to/file.ts`, `path/to/other.ts`
**Changes:** [Specific changes to make]
**Acceptance:** [How to verify this subtask is done]

### P1 Checkpoint

- [ ] All P1 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Manual verification: [specific thing to check]

---

## Phase 2: <Phase Title>

[Continue pattern...]

---

## Final Checklist

- [ ] All phases complete
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Manual smoke test completed
- [ ] Ready for review
```

### Step 6: Create the Progress Document

Create a progress tracking document at:
`/docs/<spec-directory>/<spec-prefix>-progress.md`

Use this structure:

```markdown
# Progress Log: <Project Name>

**Plan:** <link to plan file>
**Started:** [To be filled when implementation begins]
**Status:** Not Started

## Progress Tracker

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| P1    | -      | -       | -         |       |
| P2    | -      | -       | -         |       |
| P3    | -      | -       | -         |       |

## Session Log

Record each implementation session here.

### Session Template

```
## Session: <date> <time>

**Phase/Task:** P1.2
**Duration:** ~X hours
**Status:** [Completed | In Progress | Blocked]

### Completed
- [x] What was done

### Issues Encountered
- **Issue:** Description
  - **Cause:** Why it happened
  - **Solution:** How it was fixed

### Decisions Made
- **Decision:** What was decided
  - **Rationale:** Why

### Next Steps
- [ ] What to do next session
```

---

## Issues Registry

Track significant issues discovered during implementation.

| ID | Phase | Description | Status | Resolution |
|----|-------|-------------|--------|------------|
| I1 | P1.2  | Example issue | Resolved | How it was fixed |

## Deferred Items

Items discovered during implementation that are out of scope:

| Item | Reason Deferred | Follow-up |
|------|-----------------|-----------|
| -    | -               | -         |

## Retrospective

[To be filled after implementation is complete]

### What Went Well
-

### What Could Be Improved
-

### Lessons Learned
-
```

### Step 7: Present the Plan

After creating both documents, present a summary:

```markdown
## Implementation Plan Created

**Plan:** `<path to plan file>`
**Progress Log:** `<path to progress file>`

### Summary

- **Phases:** X phases, Y total subtasks
- **Estimated scope:** [Small | Medium | Large]
- **Key risk areas:** [List main risks]

### Phase Overview

| Phase | Title | Subtasks | Key Changes |
|-------|-------|----------|-------------|
| P1    | ...   | X        | ...         |
| P2    | ...   | X        | ...         |

### Ready to Start?

Before beginning implementation:
1. Review the plan for completeness
2. Ensure all tests currently pass (`npm test`)
3. Create a feature branch if using git
4. Update progress log "Started" date
```

### Step 8: Offer Next Steps

Ask:
> Would you like me to:
> 1. Start implementing Phase 1?
> 2. Adjust the phase breakdown?
> 3. Add more detail to specific subtasks?

---

## Plan Quality Guidelines

### Good Phase Design

**DO:**
- Keep phases to 2-8 subtasks
- Make each phase independently verifiable
- Order phases by dependency (foundation first)
- Include explicit test commands in checkpoints

**DON'T:**
- Create phases with only 1 subtask (merge with adjacent phase)
- Create phases with 10+ subtasks (split into smaller phases)
- Mix unrelated changes in one phase
- Skip verification steps

### Good Subtask Design

**DO:**
- Specify exact files to modify
- Describe the change concretely
- Include acceptance criteria
- Note if new tests are needed

**DON'T:**
- Use vague descriptions ("improve the code")
- Leave acceptance criteria implicit
- Combine multiple file changes without reason
- Forget to mention test updates

### Testability Requirements

Every phase MUST have at least one of:
- Automated test that verifies the phase works
- Build/typecheck that confirms no regressions
- Specific manual verification step with expected outcome

Prefer automated verification. Manual checks are acceptable only when automation is impractical.
