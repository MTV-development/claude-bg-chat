---
description: Validate a specification document against the codebase and best practices
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS

## Your Task

You are validating a specification document to ensure it's well-defined and implementable. Follow these steps:

### Step 1: Locate the Spec File

Specs live in subdirectories of `/docs/` following the pattern:
`/docs/<date>-<hex>-<project-name>/<date>-<hex>-<project-name>-spec.md`

If no spec file path was provided (`$ARGUMENTS` is empty):

1. List available spec directories in `/docs/` (folders matching `*-*-*-*/`)
2. Look for `*-spec.md` files within those directories
3. Ask the user which spec to validate:
   > Which specification would you like me to validate? [list the available specs, or provide a path]

### Step 2: Read and Parse the Spec

Read the specification file thoroughly. Identify:
- The stated goals and requirements
- Any technical decisions or assumptions made
- Referenced files, modules, or systems
- Proposed changes or additions

### Step 3: Codebase Analysis

Explore the relevant parts of the codebase to check for:

#### 3a. Technical Consistency
- Do referenced files/modules actually exist?
- Are the described APIs, functions, or interfaces accurate?
- Does the spec use correct naming conventions matching the codebase?

#### 3b. Technology Alignment
- Does the spec propose technologies already in use, or new ones?
- If new technologies, are there conflicts with existing choices?
- Are there existing patterns in the codebase the spec should follow?

#### 3c. Architecture Fit
- Does the proposed design fit the existing architecture?
- Are there existing utilities or components that should be reused?
- Does it follow established patterns in the codebase?

### Step 4: Gap Analysis

Identify any gaps that could cause implementation uncertainty:
- Undefined edge cases or error handling
- Missing details about data flow or state management
- Unclear integration points with existing code
- Ambiguous requirements that need clarification

### Step 5: Report Findings

Present a structured validation report:

```markdown
## Spec Validation Report: <spec-name>

**Validated:** <today's date>
**Status:** [READY | NEEDS REVISION | BLOCKED]

### Summary
[1-2 sentence overall assessment]

### Consistency Check
- [ ] Referenced files exist
- [ ] APIs/interfaces are accurate
- [ ] Naming conventions match codebase

### Technology Alignment
- [ ] Uses existing tech stack appropriately
- [ ] No conflicts with current choices
- [ ] Follows established patterns

### Issues Found

#### Critical (Must Fix)
[List issues that would block implementation]

#### Warnings (Should Address)
[List issues that could cause problems]

#### Suggestions (Nice to Have)
[List improvements that would strengthen the spec]

### Missing Information
[List any gaps that need clarification before implementation]

### Recommendations
[Specific next steps to make the spec implementation-ready]
```

### Step 6: Offer Next Steps

After presenting the report, ask:
> Would you like me to:
> 1. Update the spec with fixes for the issues found?
> 2. Explore any specific concern in more detail?
> 3. Create follow-up tasks for unresolved items?
