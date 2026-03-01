# Design: Server Code Quality Verification

**Date:** 2026-03-01
**Status:** Approved

## Overview

Add Biome (linter + formatter) to the server and create a `code-quality-check` skill that acts as the final gate before declaring server work complete.

## Goals

- Enforce consistent formatting and catch real code issues in `server/`
- Keep the client unchanged (it already has ESLint via Next.js)
- Create a skill that runs after TypeScript compilation and unit tests pass

## Part 1: Biome Installation

**Package:** `@biomejs/biome` (dev dependency, server only)

**Config (`server/biome.json`):**
- Recommended lint ruleset
- 2-space indentation
- Single quotes
- Semicolons
- Targets `src/` and `test/` directories

**New npm scripts in `server/package.json`:**
- `"lint": "biome lint src/ test/"`
- `"format": "biome format --write src/ test/"`

## Part 2: `code-quality-check` Skill

**Location:** User skill file
**Type:** Rigid checklist (must be followed exactly, not adapted)

**Trigger:** Invoked when the agent is about to declare server-side work complete.

**Prerequisites (assert, don't run):**
The agent must have already completed in this session:
- `npm run build` passing
- `npm test` passing

If either has not been run, stop and do those first before continuing.

**Steps:**
1. Run `npm run format` from `server/` — apply auto-fixes
2. Run `npm run lint` from `server/` — capture all errors
3. For each lint error:
   - If fixable as a code issue → fix the code directly
   - If it requires a type suppression (`// biome-ignore`) → present the specific error to the user and get explicit approval before adding the suppression comment
4. Re-run `npm run lint` — must exit clean (zero errors)
5. Only after a clean lint run may the agent claim the work is done

## Rationale

- Biome was chosen over ESLint+Prettier for simplicity: one tool, one config file, fast execution
- The recommended ruleset avoids excessive noise while still catching real bugs
- The skill is positioned as a final gate (not a per-edit check) to balance thoroughness against friction
- The prerequisite assertion (not re-running build/tests) avoids duplication when the `verification-before-completion` skill is also used
