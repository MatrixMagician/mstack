# NOTICE

mstack is a port of two Cursor plugins to Claude Code. It is a new lineage, not a fork:
the upstream `pstack` lives inside the `cursor/plugins` monorepo, and this port also merges
content from a second plugin, which a fork cannot represent cleanly.

## Provenance

| Component | Upstream | Copyright | Licence |
|---|---|---|---|
| Everything except the four skills below | [`cursor/plugins`](https://github.com/cursor/plugins) — `pstack/` at `b0b9c7a` (v0.15.4), by Lauren Tan ([poteto](https://x.com/poteto)) | © 2026 Lauren Tan | MIT — [`LICENSE`](./LICENSE) |
| `skills/deslop/`, `skills/control-cli/`, `skills/control-ui/` | [`cursor/plugins`](https://github.com/cursor/plugins) — `cursor-team-kit/skills/` | © 2026 Cursor | MIT — [`LICENSES/cursor-team-kit.LICENSE`](./LICENSES/cursor-team-kit.LICENSE) |
| Port modifications | this repository | © 2026 Oliver H. | MIT — [`LICENSE`](./LICENSE) |

The upstream history is preserved: this repository was created with `git-filter-repo` over a
full clone of `cursor/plugins`, so `git log` retains the original authorship of every file it
extracted. Because filter-repo rewrites SHAs, upstream commits cannot be cherry-picked by hash;
later upstream improvements are ported by diffing files.

## Modifications

- **Claude models only.** Every non-Anthropic model slug is removed rather than stubbed. Roles
  name Claude Code tier aliases (`fable`, `opus`, `sonnet`, `haiku`), which track the current
  release, so the upstream model-setup skill has no reason to exist and was deleted.
- **Panels manufacture their own independence.** Upstream's review panels assumed decorrelated
  blind spots across labs. A Claude-only panel cannot, so each panel section now spreads seats
  across tiers, varies reasoning effort, and leans harder on persona and rubric differentiation.
  Arena's "different model family from the parent" became "different tier, independent context".
  This is an accepted loss, not a claimed equivalence.
- **Claude Code harness.** `.claude-plugin/` manifest; `.claude/skills/` paths; `AskUserQuestion`
  in place of `AskQuestion`; MCP servers enumerated from the session tool list; skill authoring
  routed to Claude Code's `skill-creator` / `plugin-dev`.
- **Execution model.** Cursor cloud agents became background subagents with `isolation: "worktree"`
  for bounded fan-out, and dispatched background sessions for long-lived per-PR owners. Upstream's
  cloud/local partitioning prose is deleted outright: every agent is local and reads transcripts,
  simulators, and local auth directly.
- **Vendored, not depended on.** `deslop`, `control-cli`, and `control-ui` are copied in from
  `cursor-team-kit` so no cross-plugin install is required. Invocation names are unchanged.
- **Review-bot triage generalised.** The Bugbot-specific reference and the PR watcher's detection
  logic now apply to whatever review bot a repo runs, with `claude-code-action` as the worked
  example.
- **Sticky mode is a hook.** Upstream's `mode`, `icon`, `color`, and `reminder` frontmatter are Cursor
  sticky-mode keys that Claude Code ignores. `hooks/hooks.json` registers a `SessionStart` hook that
  injects `hooks/session-start-context.md` at startup, after `/clear`, and after compaction, routing
  non-trivial work into `mstack:poteto-mode`. The skills that block names are model-invocable so the
  Skill tool can reach them; the `principle-*` leaves stay user-invoked only. The approach follows
  [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) (MIT).
- **Synced to upstream `b0b9c7a`.** Upstream's v0.15.4 passes arrive: verification rounds that start
  at the code-ready head, a `children.tsv` stuck-agent audit, and quiet audit ticks in the autopilots
  and the multi-phase plan. The patch-id rule gains a noise test for test, doc, and lint-only drift,
  swarm briefs pin SHAs and method, and the two cuts of instructions current models follow unaided are
  taken. `log.sh` appends its header rather than truncating. The `setup-pstack` budget ask and the
  model slug bumps are not ported.
- **Synced to upstream `f5bdd68`.** Upstream's v0.15.0 punctuation, evidence-label, and
  operator-neutral pronoun passes, merged the same way.
- **Synced to upstream `e8d856f`.** Two principle leaves arrive (`attack-the-premise`,
  `test-behavior-not-implementation`). `how` loses its Critique Mode with upstream, so the panel
  note above no longer applies to it; adversarial architecture review lives in `interrogate`. The
  stack playbooks are forge-neutral through `gh`, and Graphite stays only in `orchestrate` and the
  `orch` script. The multi-phase plan skeleton translates upstream's `/goal` to standing orders plus
  the todolist, trunk re-reads to the installed plugin, cloud VMs per lane to worktrees, and the lane
  model to the `swarm workers` alias. Upstream's model slug bumps are not ported; roles keep tier aliases.
- **Worktree audit hardened.** `skills/poteto-mode/scripts/worktree-audit.sh` and its test are
  taken from [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) (MIT),
  a sibling port: it scans every `~/.claude/projects/` directory rather than one slug, warns when
  `jq` or `rg` is missing instead of silently blanking columns, never labels a worktree safe on
  unknown facts, and runs on GNU coreutils.
- **Dropped.** The benny automation pack (no Claude Code counterpart for Cursor's Slack-triggered
  automations) and the model-setup skill.

Skill invocation names (`/poteto-mode`, `/arena`, `/deslop`, …) are deliberately unchanged from
upstream, and the `poteto` name is retained wherever it refers to the author's style or persona.
