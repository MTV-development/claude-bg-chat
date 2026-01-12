---
description: Execute the implementation plan autonomously with progress tracking
argument-hint: [plan-file-path or spec-name]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Plan reference: $ARGUMENTS

## Your Task

You are implementing a plan autonomously, phase by phase. Your goal is to complete as much as possible while maintaining robustness, running tests continuously, and keeping the progress document updated.

### Step 1: Locate the Plan File

Plans live in subdirectories of `/docs/` following the pattern:
`/docs/<date>-<hex>-<project-name>/<date>-<hex>-<project-name>-plan.md`

If no plan file path was provided (`$ARGUMENTS` is empty):

1. List available plan files in `/docs/` (folders matching `*-*-*-*/`)
2. Look for `*-plan.md` files within those directories
3. Ask the user which plan to implement:
   > Which implementation plan would you like me to execute? [list the available plans]

### Step 2: Read Project Documents

Before starting implementation:

1. **Read the plan** - Understand the full scope, phases, and verification commands
2. **Read the progress file** - Check what's already been done (if any)
3. **Read the spec** - Understand the requirements being implemented
4. **Check git state** - Ensure you're on the correct feature branch

### Step 3: Execute Phase 0 (Environment Validation)

Every plan should have a Phase 0 that validates the environment before any code changes. This phase:

1. **Run all validation commands** from `/docs/current/` (build, type check, tests)
2. **Document baseline state** - Record which checks pass/fail BEFORE making changes
3. **Identify known issues** - Note any pre-existing failures from `/docs/current/`

If any validation step fails:
> Environment validation failed (Phase 0):
> - [List which checks failed]
> - [Note if these are known issues per /docs/current/]
>
> Would you like me to:
> 1. Fix these issues first?
> 2. Proceed and treat them as known issues?
> 3. Document them and continue with unaffected checks only?

Mark P0 complete in the progress document before proceeding to P1.

### Step 4: Implementation Loop

For each implementation phase (P1, P2, P3...), execute this loop:

#### 4a. Update Progress - Phase Start

Update the progress document:
- Set the phase status to "In Progress"
- Record the start timestamp
- Add a session log entry

#### 4b. Execute Subtasks

For each subtask (P1.1, P1.2, etc.):

1. **Read the subtask requirements** from the plan
2. **Implement the changes** as specified
3. **Run incremental verification** after each significant change:
   - Type check / build check
   - Run relevant unit tests
4. **Update progress document immediately** after completing each subtask:
   - Mark the subtask checkbox as complete in the session log
   - Add a brief comment describing what was done and any decisions made
   - Note any issues encountered and how they were resolved
   - This ensures work is recoverable if the session is interrupted mid-phase

#### 4c. Phase Checkpoint

After completing all subtasks in a phase:

1. **Run full verification** as specified in the phase checkpoint
2. **Verify acceptance criteria** for each subtask
3. **Update progress document**:
   - Mark phase as "Complete" or note issues
   - Record completion timestamp
   - Document any issues encountered and how they were resolved

#### 4d. Continue or Report

- If phase passed: Continue to next phase
- If phase failed: Document the issue and attempt to fix it
- If stuck: Stop and report to user (see Blocking Issues below)

### Step 5: Blocking Issues - STOP CONDITIONS

**STOP IMMEDIATELY and inform the user if you encounter:**

1. **Major Installation Required**
   - Frameworks like Android Studio, Xcode, Visual Studio
   - Database servers (PostgreSQL, MySQL, MongoDB) not already installed
   - Runtime environments not present (Java JDK, .NET SDK, etc.)
   - Cloud CLI tools requiring account setup (AWS CLI, gcloud, etc.)

2. **Infinite Loop / No Progress**
   - Same error recurring after 3 fix attempts
   - Tests failing in ways unrelated to the implementation
   - Build issues that seem environmental rather than code-related

3. **Credential / Access Issues**
   - API keys or secrets required but not available
   - Authentication to external services needed
   - Permission denied errors on system resources

4. **Architectural Blockers**
   - Spec requirements that conflict with codebase reality
   - Dependencies that can't be resolved
   - Breaking changes that would affect unrelated systems

When stopping, report clearly:

```markdown
## Implementation Paused

**Phase:** P2.3
**Blocker Type:** [Installation Required | Stuck | Access Issue | Architectural]

### Issue
[Clear description of what's blocking progress]

### What I Tried
- [List attempts to resolve]

### What's Needed
[Specific action the user needs to take]

### Progress So Far
[Summary of what was completed before the blocker]
```

### Step 6: Progress Document Updates

Throughout implementation, keep the progress document updated in real-time:

#### Session Log Format

```markdown
## Session: <date> <time>

**Phases Covered:** P1, P2
**Status:** [Completed | In Progress | Blocked]

### Completed
- [x] P1.1: Description of what was done
  - Comment: Key implementation details, decisions made, or issues resolved
- [x] P1.2: Description of what was done
  - Comment: Why this approach was chosen, any edge cases handled
- [x] P2.1: Description of what was done
  - Comment: Notable changes, refactoring performed, tests added

### Test Results
- Build: PASS
- Unit Tests: PASS (47/47)
- Type Check: PASS

### Issues Encountered
- **Issue:** Brief description
  - **Cause:** Root cause
  - **Solution:** How it was fixed

### Decisions Made
- **Decision:** What was decided
  - **Rationale:** Why this approach was chosen

### Code Changes Summary
- `path/to/file.ts`: Added X, modified Y
- `path/to/other.ts`: Refactored Z
```

#### Progress Tracker Updates

Keep the tracker table current:

```markdown
| Phase | Status      | Started    | Completed  | Notes          |
|-------|-------------|------------|------------|----------------|
| P1    | Complete    | 2024-01-09 | 2024-01-09 |                |
| P2    | In Progress | 2024-01-09 | -          | On subtask 2.3 |
| P3    | -           | -          | -          |                |
```

### Step 7: Test-Driven Robustness

**Testing Philosophy:**

1. **Run tests early and often** - After every significant change
2. **Don't proceed with failing tests** - Fix issues before moving on
3. **Add tests when needed** - If the plan specifies new tests, write them
4. **Verify at boundaries** - Always run full test suite at phase checkpoints

**If Tests Fail:**

1. Read the error carefully
2. Identify if it's related to your changes or pre-existing
3. If your change broke it: Fix immediately before proceeding
4. If pre-existing: Note in progress log and continue (unless blocking)

### Step 8: Completion

When all phases are complete:

1. **Run final verification** - Use the same validation commands from `/docs/current/` that you ran in Phase 0. All checks that passed before should still pass.

2. **Update progress document**:
   - Set overall status to "Complete"
   - Fill in the retrospective section
   - Note any deferred items discovered

3. **Update plan document**:
   - Mark final checklist items as complete

4. **Report completion**:

```markdown
## Implementation Complete

**Plan:** `<path to plan>`
**Duration:** [Time from first to last session]

### Summary
- Phases completed: X/X
- Subtasks completed: Y/Y
- Tests: All passing

### Key Changes Made
- [Bullet list of significant changes]

### Files Modified
- `path/to/file.ts`
- `path/to/other.ts`

### Test Results
```
[Output of final test run]
```

### Deferred Items
[Any items discovered but out of scope]

### Next Steps
- [ ] Code review
- [ ] Merge to main branch
- [ ] Update documentation if needed
```

### Step 9: Offer Follow-up

After completion (or if stopped), ask:
> Would you like me to:
> 1. Create a git commit with these changes?
> 2. Generate a PR description?
> 3. Continue from where I stopped? (if blocked)
> 4. Review any specific part of the implementation?

---

## Implementation Guidelines

### Autonomy Principles

**DO:**
- Make implementation decisions within the bounds of the spec
- Fix minor issues discovered along the way
- Add helpful code comments for complex logic
- Follow existing code patterns in the codebase
- Run tests proactively without being asked

**DON'T:**
- Deviate from the spec's requirements
- Add features not in the plan
- Make architectural changes not specified
- Skip tests to move faster
- Ignore failing tests

### Code Quality Standards

- Match existing code style in the codebase
- Add types for all new code (TypeScript projects)
- Handle errors appropriately
- Keep functions focused and readable
- Don't over-engineer - implement what's needed

### Progress Transparency

The progress document is your logbook. Update it **immediately** after each event:
- When starting a phase
- **After completing each subtask** (include a comment with what was done)
- When encountering an issue (document it before attempting fixes)
- When making a decision (record the rationale)
- When completing a phase

**CRITICAL:** Do not batch progress updates. Update the progress document after EACH subtask completion, not at the end of a phase. Include a brief comment explaining what was implemented, any decisions made, or issues resolved. This ensures:
- Work is recoverable if the session is interrupted mid-phase
- Future sessions have context for what was already done
- Issues and decisions are captured while they're fresh
