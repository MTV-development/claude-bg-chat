---
description: Create and switch to a feature branch for a spec
argument-hint: [spec-name-or-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec reference: $ARGUMENTS

## Your Task

You are creating a feature branch for implementing a specification. The branch name follows the same naming pattern as specs: `feature/<date>-<hex>-<project-name>`.

### Step 1: Determine the Branch Name

**Option A: From an existing spec**

If `$ARGUMENTS` references an existing spec (path or name pattern like `2026-01-09-7a0c-small-fixes`):

1. Extract the naming pattern from the spec directory name
2. Use that as the branch name: `feature/<naming-pattern>`

Example: Spec at `docs/2026-01-09-7a0c-small-fixes/` creates branch `feature/2026-01-09-7a0c-small-fixes`

**Option B: Find available specs**

If `$ARGUMENTS` is empty or doesn't match a spec:

1. List available spec directories in `/docs/` (folders matching `YYYY-MM-DD-*-*/`)
2. Ask the user which spec to create a branch for:
   > Which spec would you like to create a feature branch for?
   > [list available specs]
   >
   > Or provide a new project name to create a fresh branch.

**Option C: Create a new branch name**

If the user provides a project name (not matching an existing spec):

1. Generate a random 4-digit hex code
2. Construct: `feature/<today's-date>-<hex>-<project-name>`
3. Convert project name to kebab-case if needed

### Step 2: Verify Git State

Before creating the branch, check:

```bash
git status
```

- If there are uncommitted changes, warn the user:
  > You have uncommitted changes. Would you like to:
  > 1. Stash changes and continue
  > 2. Commit changes first
  > 3. Cancel branch creation

- If already on the target branch, inform the user:
  > Already on branch `feature/...`. No action needed.

### Step 3: Create and Switch to Branch

```bash
git checkout -b feature/<naming-pattern>
```

If the branch already exists:
```bash
git checkout feature/<naming-pattern>
```

### Step 4: Confirm Success

After switching, confirm:

```markdown
## Branch Created

**Branch:** `feature/<naming-pattern>`
**Based on:** `<previous-branch>`

### SDD Workflow

You're now ready to implement. The typical flow is:

1. `/sdd:checkspec` - Validate the spec (if not done)
2. `/sdd:createplan` - Create implementation plan (if not done)
3. Implement phase by phase
4. Commit regularly with descriptive messages
5. Create PR when complete

### Related Spec Files

- Spec: `docs/<naming-pattern>/<naming-pattern>-spec.md`
- Plan: `docs/<naming-pattern>/<naming-pattern>-plan.md` (if exists)
- Progress: `docs/<naming-pattern>/<naming-pattern>-progress.md` (if exists)
```

### Step 5: Offer Next Steps

Ask:
> Would you like me to:
> 1. Run `/sdd:checkspec` to validate the spec?
> 2. Run `/sdd:createplan` to create an implementation plan?
> 3. Start implementing (if plan exists)?
