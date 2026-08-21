---
name: deslop
description: Remove AI-generated code slop and clean up code style
---

# Remove AI code slop

Check the diff against main and remove AI-generated slop introduced in the branch. Given paths, work those instead of the diff.

## Focus Areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Compatibility shims and pass-through wrappers nothing calls any more, kept "for backwards compatibility" against a caller that no longer exists
- Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug. Deleting a path nothing reaches is not a behavior change, but earn that claim before you cut: search the repo for every reference, and leave the path alone when it sits on a published entry point whose consumers you cannot see.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).
