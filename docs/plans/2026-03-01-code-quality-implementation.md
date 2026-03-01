# Server Code Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install Biome (linter + formatter) in `server/`, fix all lint issues, and create a `code-quality-check` skill that gates completion of server work.

**Architecture:** Biome is installed as a dev dependency in `server/` only. A `biome.json` config targets `src/` and `test/`. Two npm scripts (`lint`, `format`) are added. A personal skill at `~/.claude/skills/code-quality-check/SKILL.md` enforces running these as the final step before claiming server work is done.

**Tech Stack:** `@biomejs/biome` (latest), npm scripts, Claude Code personal skills (`~/.claude/skills/`)

---

## Task 1: Install Biome

**Files:**
- Modify: `server/package.json`
- Create: `server/biome.json`

**Step 1: Install @biomejs/biome as a dev dependency**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm install --save-dev @biomejs/biome
```

Expected: Package installed, `package.json` updated with `"@biomejs/biome": "^X.X.X"` in devDependencies.

**Step 2: Initialize biome config**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npx biome init
```

Expected: Creates `biome.json` with a default recommended config.

**Step 3: Configure biome.json for this project's style**

Replace the generated `server/biome.json` content with:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "include": ["src/**/*.ts", "test/**/*.ts"]
  }
}
```

Note: Check the actual Biome version installed and update the `$schema` URL to match (run `npx biome --version` to confirm).

**Step 4: Add lint and format scripts to server/package.json**

In the `"scripts"` section, add:
```json
"lint": "biome lint src/ test/",
"format": "biome format --write src/ test/"
```

**Step 5: Verify both commands are available**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run lint -- --version
```

Expected: Biome version number printed.

**Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/biome.json
git commit -m "chore(server): install Biome linter and formatter"
```

---

## Task 2: Run Format and Fix Lint Issues

**Files:**
- Potentially modify: any file in `server/src/**/*.ts`, `server/test/**/*.ts`

**Step 1: Run formatter — apply auto-fixes**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run format
```

Expected: Biome auto-formats files. It will report which files were changed. Review the diff with `git diff server/src/ server/test/` to understand what changed.

**Step 2: Run linter — capture all errors**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run lint
```

Expected: Either "found 0 diagnostics" (clean) or a list of lint errors/warnings.

**Step 3: For each lint error — decide action**

Go through each lint error:

- **Auto-fixable** (Biome will say "unsafe fix" or "safe fix"): Run `npm run lint -- --apply` or `npm run lint -- --apply-unsafe` to let Biome fix it, then inspect the diff.
- **Real code issue** (e.g., unused variable, wrong type usage): Fix the code directly.
- **Requires type suppression** (e.g., a rule that can't be satisfied without complex type gymnastics): DO NOT suppress without user approval. Present the specific error, the file, and the line to the user and ask: "This lint rule [rule name] at [file:line] cannot be satisfied without [explanation]. Should I suppress it with `// biome-ignore lint/[category]/[rule]: <reason>`?"

**Step 4: Re-run lint — must be clean**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run lint
```

Expected: "found 0 diagnostics" or only suppressions that were human-approved.

**Step 5: Run existing tests — must still pass**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm test
```

Expected: All tests pass. Biome formatting should not break functionality.

**Step 6: Commit all formatting and lint fixes**

```bash
git add server/src/ server/test/
git commit -m "chore(server): apply Biome formatting and fix lint issues"
```

If there were any approved suppressions, note them in the commit message body.

---

## Task 3: Create the code-quality-check Skill (TDD for skills)

**Files:**
- Create: `~/.claude/skills/code-quality-check/SKILL.md`

The writing-skills methodology requires: RED (baseline without skill) → GREEN (write skill) → REFACTOR (close loopholes). This task follows that cycle.

### RED Phase: Establish baseline

**Step 1: Run a baseline scenario without the skill**

Dispatch a subagent with this exact prompt (no skill loaded):

```
You are a Claude Code agent working on the SmartPill server (Node.js/TypeScript/Express in /home/ken/Dev/smartPillMonoRepo/server/).

You just implemented a new feature: adding a GET /medications/:id/consumptions endpoint to list all consumptions for a specific medication. You:
- Added the route in server/src/routes/medications.ts
- Added the service function in server/src/services/consumptions.ts
- Wrote tests in server/test/consumptions.test.ts
- Ran npm run build (passes)
- Ran npm test (all tests pass)

It is 5:45pm. You have a meeting at 6pm. The feature is working. You are about to say "Implementation complete."

What do you do right now, step by step?
```

Document verbatim what the subagent does and says. Does it run `npm run lint`? Does it run `npm run format`? Or does it just declare "done"?

**Step 2: Document baseline failures**

Write down the exact rationalizations or omissions. Common expected behaviors without the skill:
- Agent declares done without running lint/format at all
- Agent says "code is clean, no need to lint"
- Agent runs build+test but not lint+format
- Agent skips because "the tests pass"

### GREEN Phase: Write the skill

**Step 3: Create the skills directory and skill file**

```bash
mkdir -p /home/ken/.claude/skills/code-quality-check
```

**Step 4: Write `~/.claude/skills/code-quality-check/SKILL.md`**

The skill content must:
- Have YAML frontmatter with `name` and `description` only (max 1024 chars total)
- `description` starts with "Use when..." and lists triggering conditions ONLY (no workflow summary)
- Be rigid (a numbered checklist to follow exactly)
- Assert prerequisites (build+test already done) rather than re-running them
- Cover the lint → format → fix loop
- Address the specific rationalizations observed in the baseline

```markdown
---
name: code-quality-check
description: Use when server TypeScript implementation is complete, build passes, and tests pass — before claiming the work is done. Use before any "implementation complete" or "done" claim on server code.
---

# Server Code Quality Check

## Overview

This is the final gate before declaring server work complete. It runs AFTER `npm run build` passes and `npm test` passes — not instead of them.

**Violating the letter of these steps is violating the spirit.**

## Prerequisites (Assert — Do NOT Re-Run)

Before starting this checklist, confirm you have already completed in this session:
- [ ] `npm run build` passed (TypeScript compiled without errors)
- [ ] `npm test` passed (all tests green)

If either has NOT been done, stop. Do those first. Come back when both are green.

## Checklist (Follow Exactly — In Order)

**Step 1: Run formatter**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run format
```

Review what changed with `git diff server/src/ server/test/`. Formatting changes are auto-applied.

**Step 2: Run linter**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run lint
```

**Step 3: For each lint error, choose one:**

A. **Fixable code issue** → Fix the code directly. Do not suppress.

B. **Complex type suppression needed** (e.g., `// biome-ignore lint/...`) → STOP. Present to the user:
   - The exact error message
   - The file and line number
   - Why the code cannot satisfy the rule without gymnastics
   - Ask: "Should I suppress this with a biome-ignore comment?"
   Only add the suppression after explicit user approval.

**Step 4: Re-run linter — must be clean**

```bash
cd /home/ken/Dev/smartPillMonoRepo/server && npm run lint
```

Expected: 0 diagnostics. If there are still errors, return to Step 3.

**Step 5: Only now claim work is done.**

## Red Flags — STOP

These thoughts mean you are rationalizing. Stop and follow the checklist.

- "The tests pass, so the code must be fine"
- "I write clean code, linting is unnecessary"
- "The build succeeded, that's enough"
- "There's no time to run lint"
- "I'll just skip format since I didn't change style"

All of these mean: Run the checklist anyway. It takes 30 seconds.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests pass = code is fine" | Tests verify behavior. Lint catches bugs tests miss. |
| "I write clean code" | Automated tools catch what human review misses. |
| "Build passed" | TypeScript compiles code that has lint errors. Both matter. |
| "No time" | `npm run lint` takes 5 seconds. This excuse is never valid. |
| "Format didn't change anything" | Run it anyway. Consistency is the point. |
```

### REFACTOR Phase: Test and close loopholes

**Step 5: Run pressure scenario WITH the skill**

Dispatch a subagent with the same scenario as Step 1, but this time include:
```
You have access to the skill: code-quality-check
```

Document whether the agent follows the checklist. If it skips steps or rationalizes away, note the exact rationalization and add it to the skill's Red Flags and Common Rationalizations tables.

**Step 6: Iterate until the agent complies under pressure**

The skill is complete when a subagent:
- Runs `npm run format` and `npm run lint` before claiming done
- Cites the skill when doing so
- Does not declare done without a clean lint run

**Step 7: Commit the skill**

```bash
git add /home/ken/.claude/skills/code-quality-check/SKILL.md
git commit -m "feat: add code-quality-check skill for server lint/format gate"
```

Wait — skills in `~/.claude/` are outside the repo. No git commit needed for the skill file itself. Just verify it is saved at the correct path.

**Step 8: Verify skill is discoverable**

```bash
ls /home/ken/.claude/skills/code-quality-check/SKILL.md
```

Expected: File exists. The skill will be available in the next Claude Code session.

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `server/package.json` | Add `lint` and `format` scripts, add `@biomejs/biome` devDependency |
| `server/package-lock.json` | Updated by npm install |
| `server/biome.json` | Created with project style config |
| `server/src/**/*.ts` | Formatted and lint-fixed |
| `server/test/**/*.ts` | Formatted and lint-fixed |
| `~/.claude/skills/code-quality-check/SKILL.md` | Created (outside repo, not committed to git) |
