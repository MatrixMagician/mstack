---
status: accepted
---

# Drop Orchestrate and check-plan with upstream, and keep mstack's tier routing

Upstream v0.15.43 deleted the Orchestrate playbook and routed program-scale work to `figure-it-out`. It also cut the Multi-phase plan playbook to five steps that never run `check-plan.mjs`, and deleted the script with its test. mstack followed both. This supersedes ADR 0003, which recorded how Orchestrate ran while mstack shipped it.

The same upstream release changed model routing. Code, prose, and judgment go to Opus 5.5 at xhigh. Fable 5.2 runs outside a panel only by name or after two failed Opus runs. No role runs above xhigh, every Opus spawn takes a `-fast` slug, and a second opinion comes from another vendor's model. mstack did not port these rules.

## Considered Options

- **Follow upstream on Orchestrate and check-plan (chosen).** One less playbook and one less script to merge on every sync. `figure-it-out` designs a bespoke run for large work, and the Autopilot playbooks carry a PR queue.
- **Keep Orchestrate as an mstack divergence.** A standing program keeps a named playbook, but `poteto-mode`, the README, and the guide conflict on every upstream sync, and the playbook has no upstream owner.
- **Keep `check-plan.mjs` for the shorter plan.** The five-step playbook has no skeleton, so the script has nothing to check.
- **Port the Opus-first routing.** Rejected. mstack's routing is tier aliases it owns (ADR 0001, ADR 0002). Upstream's rules name versioned slugs, a reasoning ladder with a cap, a speed suffix, and a second vendor. The `Agent` tool takes a tier alias and an effort, and every Claude Code model is one family, so those rules have nothing to translate to.

## Consequences

- A standing program has no playbook of its own. `poteto-mode` routes large, cross-cutting, or unattended work to `figure-it-out`.
- No playbook writes `~/.claude/orchestrate/<slug>/` now. A store from an earlier run stays on disk as plain files.
- A plan is checked by the operator who reads it, not by a script. The check-plan gate and its tests are gone.
- The Effort by tier table, the `.claude/rules/mstack-models.md` override, the tier defaults, and the tier-based panel and cross-judge rules stay as they were. A second opinion is the same prompt against a different model.
- The `architect runners`, `reflect judgment, divergent, synthesizer`, and `reflect tooling` role lines are retired, because `architect` and `reflect` no longer spawn agents. A line for one of them does nothing.
