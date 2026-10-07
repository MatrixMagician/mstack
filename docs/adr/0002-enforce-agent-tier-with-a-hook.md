---
status: accepted
---

# Enforce the Agent tier with a PreToolUse hook

ADR 0001 gave every tier a default effort, but only as prose in poteto-mode's Subagents section. Nothing checks a real spawn. A `poteto-agent` call that omits `model` or `effort` inherits the session's values without a word, and before 0.4.0 that was every call. A `PreToolUse` hook on the `Agent` tool now denies a `mstack:poteto-agent` call that names a tier without an effort, or that names neither when no role line asks for the parent model. The denial reason quotes the tier table, so the orchestrator retries with explicit values in the same turn.

The hook decides from one table over the call's input:

| `model` | `effort` | verdict |
|---|---|---|
| set | set | allow |
| set | missing | deny |
| missing | set | allow (`auto@<effort>`) |
| missing | missing | allow only when `.claude/rules/mstack-models.md` has a bare `auto` or `inherit-parent` line, else deny |

## Considered Options

- **Deny with a reason (chosen).** An omission is visible and is corrected at once. It costs one retried call.
- **Fill in the tier default with `updatedInput`.** No retry, but it hides the omission, and the hook would have to pick a tier for a call that named none.
- **Warn without blocking.** The orchestrator can ignore it, which is the failure the hook exists to stop.
- **`model` and `effort` in `poteto-agent.md` frontmatter.** It sets a floor, but which value wins over a per-call effort is not documented, and one value cannot follow the tier the caller picked.

## Consequences

- Only `mstack:poteto-agent` calls are checked. Routed skills that pick their own `subagent_type`, and built-in agents such as Explore, are left alone.
- The hook fails open. Unparseable input, or a missing `node`, lets the call through, because a guard that wedges every spawn is worse than the omission.
- The hook checks that a model and an effort are present, not that the tier suits the task. That stays the orchestrator's judgment.
