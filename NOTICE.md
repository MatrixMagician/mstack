# NOTICE

mstack is a port of two Cursor plugins to Claude Code. It is a new lineage, not a fork:
the upstream `pstack` lives inside the `cursor/plugins` monorepo, and this port also merges
content from a second plugin, which a fork cannot represent cleanly.

## Provenance

| Component | Upstream | Copyright | Licence |
|---|---|---|---|
| Everything except the four skills below | [`cursor/plugins`](https://github.com/cursor/plugins) — `pstack/` v0.14.1, by Lauren Tan ([poteto](https://x.com/poteto)) | © 2026 Lauren Tan | MIT — [`LICENSE`](./LICENSE) |
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
- **Worktree audit hardened.** `skills/poteto-mode/scripts/worktree-audit.sh` and its test are
  taken from [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) (MIT),
  a sibling port: it scans every `~/.claude/projects/` directory rather than one slug, warns when
  `jq` or `rg` is missing instead of silently blanking columns, never labels a worktree safe on
  unknown facts, and runs on GNU coreutils.
- **Dropped.** The benny automation pack (no Claude Code counterpart for Cursor's Slack-triggered
  automations) and the model-setup skill.

Skill invocation names (`/poteto-mode`, `/arena`, `/deslop`, …) are deliberately unchanged from
upstream, and the `poteto` name is retained wherever it refers to the author's style or persona.
