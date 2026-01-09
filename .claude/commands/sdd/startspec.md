---
description: Start a new specification document with interactive dialogue
argument-hint: [project-name]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Project name: $ARGUMENTS

## Your Task

You are starting a new specification document. Follow these steps:

### Step 1: Validate Project Name

If no project name was provided (`$ARGUMENTS` is empty), ask:
> What would you like to call this spec? (e.g., "dark-mode", "user-auth", "api-refactor")

Convert the name to kebab-case if needed.

### Step 2: Create the Spec Directory and File

Generate a random 4-digit hex code (e.g., `a3f2`, `7b1c`).

The naming pattern is: `<date>-<hex>-<project-name>` (e.g., `2026-01-09-a3f2-dark-mode`)

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