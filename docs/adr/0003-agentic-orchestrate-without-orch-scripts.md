---
status: accepted
---

# Run Orchestrate with the coordinator's own tools

Upstream v0.15.36 rewrote the Orchestrate playbook so the coordinator runs the program with its own tools and deleted the `orch` CLI (`scripts/orch/`, about 3k lines with its tests). mstack followed. The playbook now spawns workers with the Agent tool, keeps program state in the todolist and a `notes.md` under `~/.claude/orchestrate/<slug>/`, and checks PR state with `gh`.

## Considered Options

- **Follow upstream (chosen).** One less module to maintain, no `bun` dependency for the playbook, and no drift from the source we sync against.
- **Keep `orch` as an mstack divergence.** It keeps the TSV store and the stuck-agent audit, but every upstream sync would conflict on the playbook and the scripts would have no upstream owner.
- **Hybrid with an optional store helper.** It keeps the cost of the module and removes none of the sync friction.

## Consequences

- The "prefer active PR" fix ported in 0.6.2 lived in `orch` and is gone with it. `watch-pr` and `check-plan` keep their ported fixes.
- The standing-orders register, units table, verification ledger, and merge-frontier file no longer exist as artifacts. Verdicts and head SHAs live in `notes.md` and the PR itself.
- The Project tracker upstream names has no Claude Code counterpart, so the todolist plus `notes.md` replace it.
- Verifier decorrelation is by tier and fresh context, since every Claude Code model is one family.
