---
description: Commit completed work and create a pull request with project documentation
argument-hint: [spec-name or plan-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Project reference: $ARGUMENTS

## Your Task

You are finalizing completed implementation work by creating a well-documented commit and pull request. Follow these steps:

### Step 1: Locate the Project Documents

Find the relevant project documents in `/docs/`:

1. If `$ARGUMENTS` is provided, use it to locate the project folder
2. Otherwise, look for recent spec directories and ask which project to check in

Required documents:
- `*-spec.md` - The specification
- `*-plan.md` - The implementation plan
- `*-progress.md` - The progress log (optional but recommended)

### Step 2: Verify Readiness

Before committing, verify:

1. **Check git status** - Review all changed files
2. **Review progress document** - Confirm all phases are marked complete

If work is incomplete, inform the user:
> Implementation doesn't appear complete:
> - [List issues]
>
> Would you like to proceed anyway, or address these first?

### Step 3: Analyze Changes for Commit Message

Review the changes to understand:
- What was the primary goal? (from spec)
- What major changes were made? (from plan and git diff)
- Any notable decisions or trade-offs? (from progress log)

### Step 4: Create the Commit

Stage all relevant files and create a commit with this format:

```
<type>(<scope>): <summary>

<body - what was done and why>

Spec: docs/<project-folder>/<project>-spec.md
Plan: docs/<project-folder>/<project>-plan.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Type** should be one of:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation only
- `style` - Formatting, styling
- `test` - Adding tests
- `chore` - Maintenance

**Scope** is the area of the codebase affected (e.g., `ui`, `api`, `cli`, `auth`)

### Step 5: Identify the Base Branch

Determine where the PR should target:

1. Check current branch name for clues (e.g., `feature/dark-mode` → base is likely `main` or `master`)
2. Check git log to see where this branch diverged from
3. If unclear, ask the user:
   > Which branch should this PR target? (e.g., `main`, `master`, `develop`)

### Step 6: Push and Create Pull Request

Push the branch and create a PR with this format:

```markdown
## Summary

[2-3 sentence overview of what this PR accomplishes]

## Changes

- [Bullet list of major changes]

## Specification

This implementation follows the specification at:
- **Spec:** `docs/<project-folder>/<project>-spec.md`
- **Plan:** `docs/<project-folder>/<project>-plan.md`

## Test Plan

[How was this tested? Reference the verification steps from the plan]

## Screenshots (if applicable)

[For UI changes, include before/after or key states]

---

🤖 Generated with [Claude Code](https://claude.ai/code)
```

Use `gh pr create` with the title and body.

### Step 7: Report Completion

After the PR is created, report:

```markdown
## Check-in Complete

**Commit:** `<commit-hash>` - <commit-summary>
**PR:** <pr-url>
**Target:** <base-branch>

### What's Next

- [ ] Request code review
- [ ] Address review feedback
- [ ] Merge when approved

### Project Documents

- Spec: `<path>`
- Plan: `<path>`
- Progress: `<path>`
```

---

## Guidelines

### Commit Message Quality

**DO:**
- Summarize the "what" in the first line (50 chars max)
- Explain the "why" in the body
- Reference the spec/plan documents
- Use conventional commit format

**DON'T:**
- List every file changed
- Include implementation details in the summary
- Write vague messages like "updates" or "fixes"

### PR Description Quality

**DO:**
- Lead with the user-facing impact
- Link to specification documents
- Include test verification steps
- Mention any known limitations or follow-up work

**DON'T:**
- Copy-paste the entire spec
- Include internal notes or TODOs
- Skip the test plan section
