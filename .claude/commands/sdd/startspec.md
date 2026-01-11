---
description: Start a new specification document with interactive dialogue
argument-hint: [project-name]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Current directory: !`pwd`
- Current git branch: !`git branch --show-current 2>/dev/null || echo ""`
- Project name argument: $ARGUMENTS

## Your Task

You are starting a new specification document. Follow these steps:

### Step 1: Determine the Naming Pattern

**Option A: Explicit argument provided**

If `$ARGUMENTS` is not empty, use it as the project name. Generate a new naming pattern:
1. Generate a random 4-digit hex code (e.g., `a3f2`, `7b1c`)
2. Form the naming pattern: `<today's date>-<hex>-<project-name>`

**Option B: Infer from worktree**

If `$ARGUMENTS` is empty, check if we're in a worktree created by `/sdd:createworktree`:

1. Check the current directory name for the pattern: `<repo>-YYYY-MM-DD-XXXX-<project-name>`
2. Or check the git branch for the pattern: `feature/YYYY-MM-DD-XXXX-<project-name>`

If a matching pattern is found (e.g., `feature/2026-01-09-a3f2-dark-mode` or directory ending in `-2026-01-09-a3f2-dark-mode`):
- Extract the naming pattern: `2026-01-09-a3f2-dark-mode`
- Use this for the spec directory and file names
- Inform the user: "Detected worktree naming pattern: `<pattern>`. Using this for the spec."

**Option C: No argument and not in a worktree**

If `$ARGUMENTS` is empty AND no worktree pattern is detected, ask:
> What would you like to call this spec? (e.g., "dark-mode", "user-auth", "api-refactor")

Then generate a new naming pattern as in Option A.

Convert the project name to kebab-case if needed.

### Step 2: Create the Spec Directory and File

Use the naming pattern determined in Step 1 (either inferred from worktree or newly generated).

1. Create the directory: `/docs/<naming-pattern>/`
2. Create the spec file: `/docs/<naming-pattern>/<naming-pattern>-spec.md`

Example structure:
```
docs/
  2026-01-09-a3f2-dark-mode/
    2026-01-09-a3f2-dark-mode-spec.md      # The main specification
    2026-01-09-a3f2-dark-mode-research.md  # Additional documents use same prefix
    2026-01-09-a3f2-dark-mode-notes.md
```

Create the spec file with this template:

```markdown
# <Project Name> Specification

**Created:** <today's date>
**Status:** Draft

## Braindump / introductory thoughts

[To be defined]

## Overview

[To be defined]

## Open Questions

- [ ]

## References
[To be defined]

```
### Step 3: Start the Dialogue

After creating the file, begin a dialogue on the spec and continue until the spec is ready.

### Step 4: Iterate until satisfactory

Continue the dialogue until the spec is good.

### Step 5: Remove braindump

Upon spec ready, remove the Braindump section, making sure that everything important from there is now recorded elsewhere in the spec.