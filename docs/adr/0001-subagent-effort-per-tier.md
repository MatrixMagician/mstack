---
status: accepted
---

# Subagent effort defaults by tier, overridable by role

Every `Agent` call that names a tier passes that tier's default effort, from one table in poteto-mode's Subagents section: `fable` high, `opus` high, `sonnet` medium, `haiku` low. A role line in `.claude/rules/mstack-models.md` can override the effort with an `@<effort>` suffix (`feature, refactoring: sonnet@high`), applied per entry in a panel list. We keyed the default to the tier, not the role, because one four-row table was the smallest change that gave every spawn an explicit effort. Before this, only interrogate named one, and every other spawn ran at an undocumented default.

## Considered Options

- **One table per tier (chosen).** Two roles on the same tier share a default. The suffix is the one place a role diverges.
- **A central role registry** (`references/roles.md`, role to model to effort, with a test). It gave per-role precision but meant rewriting all fifteen call sites. A routed skill used on its own would also have read an extra file.
- **An effort value inline at each call site** (interrogate's old style). That meant fifteen hand-synced copies with no single view.
- **A per-tier effort line in the override file** (`effort: sonnet=low`). It could not tune one role without retuning its whole tier.

## Consequences

- A bare `auto` or `inherit-parent` passes no effort, so the spawn inherits the session's. `auto@low` runs on the parent model at low effort.
- A suffix that is not a valid effort level is ignored. The tier default applies, and the skill says so, the same way a rejected model override falls back.
- Interrogate's effort column is deleted. Its values matched the tier table, so the table is now the single source.
- The four default values are a starting point, not a measurement. Retune them through the Eval playbook against real tasks.
- `CLAUDE_CODE_EFFORT_LEVEL` outranks a subagent's frontmatter effort, according to the Claude Code docs. Whether it also outranks the effort an `Agent` call passes is not documented.
