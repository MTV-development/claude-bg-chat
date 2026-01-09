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

**Option C: No matching spec found**

If the user provides a project name that doesn't match an existing spec:

> No spec found for "<project-name>".
>
> In the SDD workflow, a spec should exist before creating a feature branch.
> Run `/sdd:startspec <project-name>` first to create the spec, then run this command again.
>
> The branch will use the same `<date>-<hex>-<project-name>` pattern as the spec.

### Step 2: Verify Git State is Clean

Before creating the branch, the working directory must be clean:

```bash
git status
```

**Requirements:**
1. **No uncommitted changes** - All work must be committed
2. **No untracked files** that should be committed

If there are uncommitted changes, **do not proceed**. Inform the user:
> Cannot create feature branch: uncommitted changes detected.
>
> Please commit or stash your changes first:
> - `git add . && git commit -m "..."` to commit
> - `git stash` to stash temporarily
>
> Then run this command again.

If already on the target branch, inform the user:
> Already on branch `feature/...`. No action needed.

### Step 3: Push Current Branch to Remote

Before creating the new branch, ensure the current branch is pushed:

```bash
git push -u origin <current-branch>
```

This ensures:
- The base branch exists on remote
- PRs will compare against a pushed state
- No local-only commits are lost

If push fails due to auth or remote issues, warn and ask whether to proceed.

### Step 4: Create and Switch to Branch

First, check if the branch already exists:

```bash
git branch --list "feature/<naming-pattern>"
```

If the branch already exists, **do not proceed**. Inform the user:
> Branch `feature/<naming-pattern>` already exists.
>
> If you want to continue work on this branch:
> - `git checkout feature/<naming-pattern>`
>
> If you want to start fresh:
> - `git branch -D feature/<naming-pattern>` (delete local)
> - Then run this command again

If the branch doesn't exist, create it:
```bash
git checkout -b feature/<naming-pattern>
```

### Step 5: Confirm Success

After switching, confirm:

```markdown
## Branch Created

**Branch:** `feature/<naming-pattern>`
**Base branch:** `<previous-branch>` (pushed to remote)
**PR target:** `<previous-branch>`

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

### Step 6: Offer Next Steps

Ask:
> Would you like me to:
> 1. Run `/sdd:checkspec` to validate the spec?
> 2. Run `/sdd:createplan` to create an implementation plan?
> 3. Start implementing (if plan exists)?
