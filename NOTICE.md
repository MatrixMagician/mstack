# NOTICE

mstack is a port of two Cursor plugins to Claude Code. It is a new lineage, not a fork:
the upstream `pstack` lives inside the `cursor/plugins` monorepo, and this port also merges
content from a second plugin, which a fork cannot represent cleanly.

## Provenance

| Component | Upstream | Copyright | Licence |
|---|---|---|---|
| Everything except the four skills below | [`cursor/plugins`](https://github.com/cursor/plugins) — `pstack/` at `101b274` (v0.15.25), by Lauren Tan ([poteto](https://x.com/poteto)) | © 2026 Lauren Tan | MIT — [`LICENSE`](./LICENSE) |
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
  injects `hooks/session-start-context.md` at startup, on resume, after `/clear`, and after compaction, routing
  non-trivial work into `mstack:poteto-mode`. The skills that block names are model-invocable so the
  Skill tool can reach them; the `principle-*` leaves stay user-invoked only. The approach follows
  [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) (MIT).
- **Guide wording and the plan playbook rule from upstream `c742dd6` (v0.15.36).** Guide pages 02 to
  10 take the plain wording of upstream `019a6a2`. The plan playbook states when to pick
  Autopilot-full and when to pick Autopilot-stack. It pointed at a paragraph that the `ab1f702` port
  removed. Not ported: the `/statechart` and `/ketchup-video` sections of the guide.
- **Two script fixes ahead of upstream.** `watch-pr` no longer attaches a fork PR to the watched stack
  as a child. Its `--pretty` output removes CSI sequences and control characters from review comment
  text, failed check text, and query failure details, and it turns a tab or a carriage return into a
  space. Text inside other escape sequences stays visible as plain text. `log.sh` in
  `show-me-your-work` writes to a log path that starts with a dash. Upstream has open, unmerged PRs
  for the fork child, the review comment text, and the dash path. The code here is written for this
  port.
- **Three missed fixes from upstream `c742dd6` (v0.15.36).** A line check of upstream's `101b274` to
  `c742dd6` range found three merged fixes that the earlier ports skipped. `ketchup` lists every item
  that waits on the user and never cuts an item to fit a word count. `reflect` never edits a skill
  under `plugins/cache/` and copies the skill to `.claude/skills/` first. `typescript-best-practices`
  makes a brand with a type guard, not with `as`. The `101b274` pin below still marks the last full sync.
- **Agentic Orchestrate from upstream `c742dd6` (v0.15.36).** The playbook runs on the coordinator's own
  tools and `scripts/orch/` is deleted, as upstream did (ADR 0003). Verifiers differ by tier, not
  family, and workers use worktree isolation in place of cloud VMs.
- **Skill updates from upstream `ab1f702` (v0.15.35).** `poteto-mode` restates the goal and chains
  model fallbacks. The autopilot playbooks block a PR only on a shown problem, push each finished
  unit, and give wording-only changes no verifier. `interrogate` keeps only findings a rerun proves and
  loses its four reference files. `arena` drops or replaces a rejected seat and may skip the judge.
  Autopilot-stack is Autopilot-full without the merge, and a PR stacks only on a PR it builds on.
  Not ported: the cross-judge family rule (every Claude Code model is one family, so mstack keeps
  its tier rule), `ketchup-video`, and `setup-pstack`.
- **Formal verification from upstream `9f844cd` (v0.15.35).** `create-formal-verification-skill` and
  `maintain-formal-verification-skill` are new, with the `poteto-help`, guide, `sharpen`, and `swarm`
  edits that came with them. Not ported: `statechart` (it needs a TLA+ toolchain fetched at run time),
  `ketchup-video`, `make-bot-ui`, `setup-pstack`, and the `/statechart` pointer in the generated verify
  skill.
- **Script fixes from upstream `9f844cd` (v0.15.35).** Four `poteto-mode` script fixes arrive without
  a full sync. `watch-pr` ignores fork heads when it orders a stack and caps each poll sleep at the
  remaining deadline. `orch` prefers a branch's sole open PR over its closed history. `check-plan`
  matches code-span delimiters of equal length. The `101b274` pin below still marks the last full sync.
- **Synced to upstream `101b274`.** Upstream's v0.15.16 to v0.15.25 work arrives. Three skills
  (`ketchup`, `in-your-own-words`, `sharpen`) are new. `poteto-mode` runs in the chat that receives
  it and `poteto-agent` is a delegate wrapper. Subagent effort matches the job. Four principles are
  restated as reasoning, and `why`, `how`, `interrogate`, `arena`, and `reflect` are distilled.
  `watch-pr` paginates review threads, `worktree-audit` checks MERGED against the default branch,
  and `check-plan` respects fenced code blocks. Upstream's Claude Code and Codex packaging, the
  generated harness trees, and the Grok-only agent rename are not ported.
- **Synced to upstream `df58112`.** Upstream's v0.15.6 to v0.15.15 work arrives. Two skills
  (`correct`, `benchmark-checklist`) and one principle (`explain-the-number`) are new, and
  `poteto-help` is rewritten for Claude Code. It points at this repo, describes the SessionStart
  hook in place of Custom Modes, and has no setup skill to send users to. Subagents are fresh by
  default, the autopilot tick runs as `/loop 1h` with no armed goal, `architect` screens designs
  against an agent contributor, and perf work orders fixes by the performance mantras. The model
  slug changes, `setup-pstack`, `make-bot-ui`, the built-in PR tool rule, and the guide sections
  on platform-only features are not ported.
- **Synced to upstream `12d587d`.** Upstream's v0.15.5 rule-conflict fixes arrive. Autopilot owners
  babysit their own PRs and publish their own rebases with `--force-with-lease`. Every routed skill
  reads its named line in `.claude/rules/mstack-models.md` the same way, and the decision-log audit
  is append-only with per-run `start` rows. The cross-lab family fallback, the `setup-pstack`
  retired-role cleanup are not ported, and the plan lane check already read `swarm workers`.
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
