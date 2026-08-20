# SPEC: Port of pstack to Claude Code

**Status:** Draft for implementation
**Plugin name:** `mstack`
**Upstream:** `github.com/cursor/plugins` — `pstack/` (v0.14.1) plus three skills from `cursor-team-kit/`
**Target:** A standalone Claude Code plugin, Claude models only
**Audience:** This spec is written to be executed by Claude Code with the upstream checkout available.

---

## 1. Goals and non-goals

**Goals**

- Produce a self-contained Claude Code plugin with functional parity with pstack's workflows: poteto-mode and its playbooks, the principle skills, the review/arena/interrogate panels, the verification-skill generator, and live-surface verification via the control skills.
- Claude models only. All references to OpenAI, xAI, or any non-Anthropic provider are removed, not stubbed.
- No dependency on any external plugin. The three cursor-team-kit skills this port needs (`deslop`, `control-cli`, `control-ui`) are vendored in.

**Non-goals**

- Cross-family model judging. Accepted loss; mitigations in §5.
- The benny automations. Dropped entirely (no Claude Code counterpart for Cursor's Slack-triggered automations; out of scope).
- Cursor cloud execution. Replaced with local background subagents and dispatched background sessions (§8).
- MCP-based browser tooling (Playwright MCP / Chrome DevTools MCP). Deliberately deferred; the vendored control skills' harness-reuse approach ships first. Revisit only if the text-first harnesses prove insufficient.

## 2. Repository, naming, and licensing

- **New repository under a new name — not a GitHub fork.** Rationale: pstack is a subdirectory of the `cursor/plugins` monorepo, so a GitHub fork drags in ~18 unrelated Cursor plugins, the Cursor marketplace schema, and an upstream that will keep evolving in Cursor's format. The port also merges content from two upstream plugins (pstack + cursor-team-kit), which a fork cannot represent cleanly. Upstream's own README invites this: "fork it. improve it. make it yours."
- **Name:** `mstack`. A new name rather than "pstack": the original name is the author's brand, and a same-named plugin in Claude Code marketplaces invites confusion with any official port the author may later publish; mstack echoes the upstream naming (poteto's pstack → MatrixMagician's mstack) while being unambiguously distinct. The `name` field in `plugin.json` drives all skill/agent namespacing (`mstack:arena` etc.) and is immutable once published to a marketplace — verify github.com/MatrixMagician/mstack is free and search the official and major community marketplaces for the string before first publish.
- **Invocation names:** keep the skill-level names (`/poteto-mode`, `/arena`, `/deslop`, …) unchanged. They are muscle memory for anyone coming from upstream, and renaming them breaks every cross-reference inside the playbooks.
- **Licensing:** both source plugins are MIT with Cursor's copyright. Retain both licence texts: keep pstack's `LICENSE` at the repo root, add `LICENSES/cursor-team-kit.LICENSE` for the three vendored skills, and add a `NOTICE` section to the README stating the port's provenance (pstack by Lauren Tan / poteto; deslop, control-cli, control-ui from cursor-team-kit; both © Cursor, MIT) and summarising the modifications (Claude-only models, Claude Code paths, vendored skills, dropped components).

### 2.1 Extraction procedure (history-preserving)

Preferred over a flat copy: it retains upstream authorship in `git log`, which both honours attribution and makes later manual diffing against upstream easier.

```bash
# 1. Fresh full clone (filter-repo refuses to run on dirty/partial clones)
git clone https://github.com/cursor/plugins.git port-src && cd port-src

# 2. Install git-filter-repo (pip install git-filter-repo, or brew install git-filter-repo)

# 3. Extract the four paths and rewrite them into the new layout
git filter-repo \
  --path pstack/ \
  --path cursor-team-kit/skills/deslop/ \
  --path cursor-team-kit/skills/control-cli/ \
  --path cursor-team-kit/skills/control-ui/ \
  --path cursor-team-kit/LICENSE \
  --path-rename pstack/: \
  --path-rename cursor-team-kit/skills/deslop/:skills/deslop/ \
  --path-rename cursor-team-kit/skills/control-cli/:skills/control-cli/ \
  --path-rename cursor-team-kit/skills/control-ui/:skills/control-ui/ \
  --path-rename cursor-team-kit/LICENSE:LICENSES/cursor-team-kit.LICENSE

# 4. Point at the new home and push
git remote add origin git@github.com:MatrixMagician/mstack.git
git push -u origin main
```

**Tracking upstream afterwards:** filter-repo rewrites SHAs, so upstream commits will not cherry-pick by hash. Keep a plain clone of `cursor/plugins` on the side and port upstream improvements by diffing files (`git -C plugins log --oneline -- pstack/` to spot changes, then hand-apply). Given the divergence this port introduces, file-level diffing is the realistic sync model anyway.

## 3. Structural changes

| Item | Upstream | Port |
|---|---|---|
| Manifest location | `.cursor-plugin/plugin.json` | `.claude-plugin/plugin.json` |
| Manifest `name` | `pstack` | `mstack` |
| Cursor-only manifest fields | `category`, `tags` | Delete (Claude Code would only warn, but there is no reason to keep them) |
| `"skills": "./skills/"`, `"agents": "./agents/"` | present | Keep — valid Claude Code component-path fields pointing at the defaults |
| `automations/` (benny) | present | Delete directory and all references |
| `docs/guide/` | Cursor-centric walkthrough | Rewrite in place for Claude Code terminology (or delete for v1 and regenerate later; do not ship Cursor instructions) |
| Agent frontmatter | `is_background: true` (poteto-agent) | `background: true` (Claude Code field name) |
| Version | 0.14.1 | Reset to `0.1.0`; the port is a new lineage |

Validate with `claude plugin validate . --strict` after the structural pass and after every subsequent section.

## 4. Path remaps

Apply everywhere, including playbooks and references files:

| Upstream path | Port path |
|---|---|
| `~/.cursor/rules/pstack-models.mdc` | Removed — see §5 (model config becomes inline defaults; optional override at `.claude/rules/mstack-models.md`) |
| `.cursor/skills/…` (generated skills: `verify-<app>`, `<handle>-mode`) | `.claude/skills/…` (project) / `~/.claude/skills/…` (personal) |
| `~/.cursor/projects/<slug>/agent-transcripts/*.jsonl` | `~/.claude/projects/<escaped-cwd>/*.jsonl` — **not a string swap**; see §7 |
| `mcps/` directory enumeration (why skill) | Enumerate available MCP tools from the session tool list |

## 5. Model policy (Claude-only)

Delete every non-Anthropic slug (`gpt-5.6-sol-max`, `grok-4.6-fast-xhigh`, and variants). Replace with Claude Code model aliases, which the `Task` tool's `model` field accepts and which track the latest release — this removes the staleness problem `setup-pstack` existed to manage.

**Role → model defaults (inline in each skill):**

| Role | Model |
|---|---|
| Judgment and prose; hardest tasks; synthesizers; cross-judges; explainer | `claude-fable-5` |
| Second judgment voice on panels | `opus` |
| Feature / refactoring / bug-fix / perf / hillclimb runners; reflect tooling; explorer | `sonnet` |
| Swarm workers; why-investigators; cheap fan-out | `haiku` |
| Panels (how critics, arena runners, architect runners, interrogate reviewers) | `claude-fable-5`, `opus`, `sonnet` — three seats by default, differentiated primarily by persona/rubric (see mitigation below) |
| Arena cross-judge | `claude-fable-5`, preferring a different **tier** from the parent when the parent is known |

**Mitigating the loss of family diversity.** Upstream's panels assume decorrelated blind spots across labs. A Claude-only panel must manufacture independence three ways, and each skill's panel section is edited to say so: (a) tier diversity — never compose a panel from a single tier; (b) effort diversity — use the agent `effort` frontmatter field to run seats at different thinking budgets; (c) persona diversity — lean harder on the existing Reviewer A/B/C/D rubric differentiation, which upstream already half-relies on. Arena's "different model family from the parent" instruction is rewritten to "different tier from the parent, and independent context". Orchestrate's "run a unit's verifier on a different model family from its worker" is rewritten to "different tier, and never the same agent".

**setup-pstack.** Delete the skill. Its detection machinery (enumerate entitled slugs, validate, never persist unconfirmed models) exists because Cursor entitlements vary per user; every Claude Code user has the same tiers. If a per-user override is wanted later, a plain `.claude/rules/mstack-models.md` with the same one-line-per-role shape can be reintroduced, and each skill already falls back to inline defaults when no override line exists — keep that fallback sentence, delete the `.mdc` lookup path.

## 6. Built-in and cross-plugin substitutions

| Upstream reference | Port |
|---|---|
| `AskQuestion` tool | `AskUserQuestion` |
| Cursor's built-in `create-skill` skill (poteto-mode, automate-me, reflect) | Claude Code's `plugin-dev` / skill-creator skills; keep the draft → test → iterate loop wording |
| `deslop` "from the `cursor-team-kit` plugin" | Vendored `skills/deslop/` (§9.1); change attribution only, invocation `/deslop` unchanged |
| `control-cli` / `control-ui` "from `cursor-team-kit`" | Vendored `skills/control-cli/`, `skills/control-ui/` (§9.2) |
| Cursor's built-in `babysit` skill (opening-a-pr; poteto-mode routing note) | Delete the built-in reference; pstack's own `playbooks/babysit.md` is the sole babysit path |
| Bugbot / `references/bugbot-triage.md` | Generalise to "PR review-bot comments" so the triage logic applies to whatever bot posts on the repo's PRs (claude-code-action, CodeRabbit, etc.); keep the skeptical-triage content, delete Bugbot-specific mechanics |
| `verify-this` (control-ui line) | Point at the evidence conventions of the generated `verify-<app>` skills |
| "a Cursor restart" (pause-safely trigger list) | "a Claude Code restart" |

## 7. Rewrites (re-authoring, not translation)

### 7.1 Transcript-reading skills: `recall`, `reflect`, `show-me-your-work`

These describe Cursor's transcript store (slug encoding, per-line message schema). Claude Code also stores sessions as JSONL under `~/.claude/projects/<escaped-cwd>/`, but the path-escaping convention and line schema differ, so a path swap yields skills that find the directory and misparse it.

Procedure: generate a real Claude Code session in a scratch project; read its JSONL; rewrite each skill's location and parsing instructions against the observed schema (message roles, tool-use records, session/UUID layout); preserve upstream's privacy guardrail verbatim in spirit — *never glob across other projects' directories; use only the active workspace's transcript path*. Then exercise all three skills against that real transcript before sign-off. Treat this as the port's highest-risk work item.

### 7.2 `deslop`

Vendored from cursor-team-kit (§9.1), then rewritten to the maintainer's own slop standards. The upstream text is platform-neutral, so the Claude Code port itself needs zero changes — the rewrite is editorial policy, out of this spec's scope beyond: keep the guardrails section's behaviour-preservation and minimal-edit rules.

## 8. Execution model: Cursor cloud agents → Claude Code

Two distinct upstream roles, two distinct native replacements:

1. **Bounded fan-out** (swarm verifiers, arena runners, orchestrate worker/verifier pairs): `Task` subagents with `background: true` and `isolation: "worktree"`. Preserves one-writer-per-worktree exactly as `principle-separate-before-serializing-shared-state` demands.
2. **Long-lived detached owners** (autopilot's one-owner-per-PR, babysit-to-green loop): dispatched **background sessions** (agent view), one per PR, each a full session in its own worktree. Matches "owner owns the full lifecycle" better than a subagent reporting into a parent context.

**Playbook edits** (`autopilot-full`, `autopilot-stack`, `orchestrate`, `shipping`):

- Replace every "Cursor cloud agent" / `environment: "cloud"` with the mapping above.
- **Delete** orchestrate's cloud/local partitioning prose ("cloud agents cannot read the local store, so briefs inline what they need…") — every session and subagent is now local and reads transcripts, simulators, and local auth directly. This is a net simplification; take it fully rather than leaving vestigial caveats.
- Do not use agent teams for the owner pattern: teammates are not worktree-isolated, which reintroduces the shared-checkout hazard the worktree discipline exists to prevent.
- Add one honest operational note to the overnight/autopilot playbooks: background sessions persist through sleep but not shutdown; recover with `claude respawn` / `--resume`. Overnight runs require the machine awake, or manual placement on Anthropic-hosted execution (web sessions / cloud scheduled tasks), which cannot be spawned programmatically from within a running session.

## 9. Vendored skills

### 9.1 `skills/deslop/` (from cursor-team-kit)

Copy verbatim (extraction in §2.1 already places it). No Cursor references exist in the file. Follow-up rewrite per §7.2.

### 9.2 `skills/control-cli/` and `skills/control-ui/` (from cursor-team-kit)

Copy verbatim — both are platform-neutral (tmux / PTY / inspector; Playwright / CDP / repo-native harnesses) and were confirmed to contain no Cursor references. Edits:

- control-ui: the single `verify-this` line → §6 substitution.
- Both: no new dependencies; keep the harness-reuse-first, no-unsolicited-installs stance.

These restore the shipping playbook's invariant — *live surface verification is the floor for a merge verdict* — with its original mechanism. The playbook lines referencing `control-cli`/`control-ui` "from cursor-team-kit" change attribution only.

## 10. Work items by component

**Verbatim (no edits):** all 21 `principle-*` skills; `tdd`, `no-comments`, `unslop`, `teach`, `technical-writing`, `typescript-best-practices`, `bro`, `blast-radius`, `figure-it-out`, `arena`'s reference files, `how`/`why`/`interrogate`/`reflect`/`architect` reference and prompt files except where §5/§6 terms appear; `poteto-mode/scripts/` (bun scripts run wherever bun is installed; note the nested `package.json` means Claude Code's automatic dependency install does not fire — deps install on first use, which is acceptable).

**Line edits:** `arena`, `swarm`, `interrogate`, `how`, `why`, `architect` (§5 models); `automate-me`, `create-verification-skill`, `maintain-verification-skill` (§4 paths, §6 create-skill); `comment-sicko` agent (none needed — verify only); `poteto-agent` (§3 frontmatter).

**Poteto-mode:** SKILL.md routing table (§6 substitutions; delete control-skill external attribution; delete built-in-babysit disambiguation note) and the five playbooks named in §8 plus `opening-a-pr` and `pause-safely` (§6).

**Delete:** `automations/` (benny), `setup-pstack`, all non-Anthropic model slugs, orchestrate's cloud/local partition prose, Cursor-built-in references.

**Rewrite:** `recall`, `reflect`, `show-me-your-work` (§7.1); `deslop` policy pass (§7.2); `docs/guide/` (§3).

## 11. Validation and acceptance

1. `claude plugin validate . --strict` passes with zero warnings.
2. Load with `claude --plugin-dir .`; confirm every skill appears under `mstack:` and both agents appear in the @-mention typeahead.
3. Grep gate: zero matches for `cursor`, `Cursor` (case-sensitive, excluding LICENSES/ and NOTICE), `gpt-`, `grok`, `bugbot`, `benny`, `cursor-team-kit`, `.mdc`, `AskQuestion` (bare), `is_background`, `environment: "cloud"`.
4. Smoke tests: `/poteto-mode` on a trivial bug-fix in a scratch repo end to end; `/arena` with the three-seat panel; `/swarm` spawning haiku workers in background worktrees; `/create-verification-skill` writing to `.claude/skills/`; `/deslop` and `/no-comments` on a deliberately sloppy diff; `/control-cli` against a sample TUI via the tmux harness.
5. Transcript trio (§7.1) exercised against a real session file — the acceptance bar is correct parsing, not merely finding the directory.
6. Install path check: repo consumable via `--plugin-dir`, as a `~/.claude/skills/` skills-directory plugin, and (once a `.claude-plugin/marketplace.json` is added) via `/plugin marketplace add MatrixMagician/mstack`.

## 12. Open decisions

- Whether `docs/guide/` is rewritten for v1 or deleted and regenerated after the port stabilises.
- Which review bot, if any, the generalised triage reference should exemplify.
- Whether to reintroduce a per-user model override file (deferred; inline defaults only for v1).
