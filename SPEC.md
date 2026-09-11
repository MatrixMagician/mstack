# SPEC: Port of pstack to Claude Code

**Status:** Implemented on branch `port/mstack`. Sections below are corrected against what the port actually required; every claim marked **Correction** was wrong in the draft and is retained so the reasoning stays auditable.
**Plugin name:** `mstack`
**Upstream:** `github.com/cursor/plugins` — `pstack/` (v0.14.1, synced to `f5bdd68`, v0.15.0) plus three skills from `cursor-team-kit/`
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
- **Licensing:** both source plugins are MIT, but **not under the same copyright**. **Correction:** the draft said "both source plugins are MIT with Cursor's copyright". `pstack/LICENSE` is © 2026 **Lauren Tan**; only `cursor-team-kit/LICENSE` is © 2026 Cursor. Retain both texts: root `LICENSE` carries Lauren Tan's line plus a second line for the port's own modifications (© 2026 Oliver H.), and `LICENSES/cursor-team-kit.LICENSE` covers the three vendored skills. Provenance and the modification summary live in a top-level `NOTICE.md` rather than a README section, so the port gate (§11.3) can exempt one file whose whole job is naming the upstream, without exempting the README wholesale.

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

# 4. Merge into the target repo WITHOUT destroying its existing history
#    (see the correction below; do NOT push this rewritten history over main)
cd /path/to/mstack
git checkout -b port/mstack
git remote add upstream-extract /path/to/port-src
git fetch upstream-extract
git merge --allow-unrelated-histories upstream-extract/main
git remote remove upstream-extract   # it points at a temp clone
```

**Correction: step 4 as originally drafted destroys the target repo.** The draft ended with
`git remote add origin … && git push -u origin main`, which lands the rewritten history *over*
whatever `main` already holds — in this case the repo's initial commit carrying `LICENSE`,
`SPEC.md`, `AGENTS.md` and `docs/`. Merging with `--allow-unrelated-histories` onto a branch keeps
both lineages, preserves all 76 upstream commits in `git log`, and needs no force-push. Expect
exactly one conflict, `LICENSE` (add/add), resolved per §2.

`git-filter-repo` is not bundled with git; install it first (`pip install --user git-filter-repo`).

**Tracking upstream afterwards:** filter-repo rewrites SHAs, so upstream commits will not cherry-pick by hash. Keep a plain clone of `cursor/plugins` on the side and port upstream improvements by diffing files (`git -C plugins log --oneline -- pstack/` to spot changes, then hand-apply). Given the divergence this port introduces, file-level diffing is the realistic sync model anyway.

## 3. Structural changes

| Item | Upstream | Port |
|---|---|---|
| Manifest location | `.cursor-plugin/plugin.json` | `.claude-plugin/plugin.json` |
| Manifest `name` | `pstack` | `mstack` |
| Cursor-only manifest fields | `category`, `tags` | Delete (Claude Code would only warn, but there is no reason to keep them) |
| `"skills": "./skills/"`, `"agents": "./agents/"` | present | **Delete both.** **Correction:** the draft called these "valid Claude Code component-path fields". `claude plugin validate --strict` rejects a directory string for `agents` in every form (`"./agents/"`, `["./agents/"]`, `["./agents"]`); it accepts only an array of explicit `.md` paths. `skills` does accept a string. Both point at the discovery defaults, so dropping both beats hand-maintaining a file list. |
| `automations/` (benny) | present | Delete directory and all references |
| `docs/guide/` | Cursor-centric walkthrough | Rewrite in place for Claude Code terminology (or delete for v1 and regenerate later; do not ship Cursor instructions) |
| Agent frontmatter | `is_background: true` (poteto-agent) | `background: true` (Claude Code field name) |
| Version | 0.14.1, later synced to `f5bdd68` | Reset to `0.1.0`; the port is a new lineage |
| `CLAUDE.md` at repo root | n/a (added by this repo) | Rename to `AGENTS.md`. A root `CLAUDE.md` is itself a `--strict` warning in a plugin repo ("not loaded as project context"), and §11.1 demands zero warnings. Claude Code still loads `AGENTS.md` as project context. |
| `.claude-plugin/marketplace.json` | n/a | Add it, so the `/plugin marketplace add` install path in §11.6 actually resolves. Validate separately: `claude plugin validate .claude-plugin/marketplace.json --strict`. |

Validate with `claude plugin validate . --strict` after the structural pass and after every subsequent section.

## 4. Path remaps

Apply everywhere, including playbooks and references files:

| Upstream path | Port path |
|---|---|
| `~/.cursor/rules/pstack-models.mdc` | Removed — see §5 (model config becomes inline defaults; optional override at `.claude/rules/mstack-models.md`) |
| `.cursor/skills/…` (generated skills: `verify-<app>`, `<handle>-mode`) | `.claude/skills/…` (project) / `~/.claude/skills/…` (personal) |
| `~/.cursor/projects/<slug>/agent-transcripts/*.jsonl` | `~/.claude/projects/<escaped-cwd>/<sessionId>.jsonl` — **not a string swap**; see §7.1 for the observed schema. The escaping rule maps `/`, `.` **and `_`** to `-`, and the layout is flat: no `agent-transcripts/` level, no per-session subdirectory. |
| `mcps/` directory enumeration (why skill) | Enumerate available MCP tools from the session tool list |

## 5. Model policy (Claude-only)

Delete every non-Anthropic slug (`gpt-5.6-sol-max`, `grok-4.6-fast-xhigh`, and variants). Replace with Claude Code model aliases, which the `Task` tool's `model` field accepts and which track the latest release — this removes the staleness problem `setup-pstack` existed to manage.

**Correction: use the bare aliases, not versioned slugs.** The draft's table wrote `claude-fable-5`. The alias form the `model` field takes is `fable` / `opus` / `sonnet` / `haiku`, and only the bare form actually follows the current release. Writing a version number back into the table reintroduces exactly the staleness this section exists to remove.

**Role → model defaults (inline in each skill):**

| Role | Model |
|---|---|
| Judgment and prose; hardest tasks; synthesizers; cross-judges; explainer | `fable` |
| Second judgment voice on panels | `opus` |
| Feature / refactoring / bug-fix / perf / hillclimb runners; reflect tooling; explorer | `sonnet` |
| Swarm workers; why-investigators; cheap fan-out | `haiku` |
| Panels (how critics, arena runners, architect runners, interrogate reviewers) | `fable`, `opus`, `sonnet` — three seats by default, differentiated primarily by persona/rubric (see mitigation below) |
| Arena cross-judge | `fable`, preferring a different **tier** from the parent when the parent is known |

**Mitigating the loss of family diversity.** Upstream's panels assume decorrelated blind spots across labs. A Claude-only panel must manufacture independence three ways, and each skill's panel section is edited to say so: (a) tier diversity — never compose a panel from a single tier; (b) effort diversity — use the agent `effort` frontmatter field to run seats at different thinking budgets; (c) persona diversity — lean harder on the existing Reviewer A/B/C/D rubric differentiation, which upstream already half-relies on. Arena's "different model family from the parent" instruction is rewritten to "different tier from the parent, and independent context". Orchestrate's "run a unit's verifier on a different model family from its worker" is rewritten to "different tier, and never the same agent".

**setup-pstack.** Delete the skill. Its detection machinery (enumerate entitled slugs, validate, never persist unconfirmed models) exists because Cursor entitlements vary per user; every Claude Code user has the same tiers. If a per-user override is wanted later, a plain `.claude/rules/mstack-models.md` with the same one-line-per-role shape can be reintroduced, and each skill already falls back to inline defaults when no override line exists — keep that fallback sentence, delete the `.mdc` lookup path.

## 6. Built-in and cross-plugin substitutions

**Correction: the draft missed an entire category** — Cursor `Task`-tool parameters that have no Claude Code equivalent. They are folded into the table below (`generalPurpose`, `readonly`, `run_in_background`). Each is a deletion rather than a rename, and each deletion also removes prose that only made sense on Cursor.

| Upstream reference | Port |
|---|---|
| `AskQuestion` tool | `AskUserQuestion` |
| Cursor's built-in `create-skill` skill (poteto-mode, automate-me, reflect) | Claude Code's `plugin-dev` / skill-creator skills; keep the draft → test → iterate loop wording |
| `deslop` "from the `cursor-team-kit` plugin" | Vendored `skills/deslop/` (§9.1); change attribution only, invocation `/deslop` unchanged |
| `control-cli` / `control-ui` "from `cursor-team-kit`" | Vendored `skills/control-cli/`, `skills/control-ui/` (§9.2) |
| Cursor's built-in `babysit` skill (opening-a-pr; poteto-mode routing note) | Delete the built-in reference; pstack's own `playbooks/babysit.md` is the sole babysit path |
| Bugbot / `references/bugbot-triage.md` | Rename the file to `references/review-bot-triage.md` and generalise to "PR review-bot comments", with **`claude-code-action` as the worked example** (§12); keep the skeptical-triage content, delete Bugbot-specific mechanics. This is **not prose-only**: `poteto-mode/scripts/watch-pr/` contains real TypeScript with tests whose detection keys off Cursor's bot login and a `CURSOR_AUTOMATION_ID` body marker. Generalise it to bot-shaped logins (`[bot]` suffix or a `-bot` segment) and an unanchored `AUTOMATION_ID` pattern, which still matches any vendor-prefixed form. Rename `isBugbot`/`bugbotReviewPasses` to `isReviewBot`/`reviewBotPasses` across `github.ts`, `types.ts`, `render.ts` and `policy.ts`. Do it test-first; baseline is 52 passing. |
| `verify-this` (control-ui line) | Point at the evidence conventions of the generated `verify-<app>` skills |
| "a Cursor restart" (pause-safely trigger list) | "a Claude Code restart" |
| Cursor's `/loop` command | Claude Code's own `/loop` command — same name, so this is an attribution fix only |
| `subagent_type: generalPurpose` | `subagent_type: general-purpose` |
| `readonly: true` / `readonly: false` on `Task` | **Delete the parameter.** Claude Code has no `readonly` flag, so the read-only constraint is stated in the subagent's prompt instead. Delete the surrounding "readonly strips MCP" rationale outright: subagents reach MCP tools through the session tool list regardless, so the whole justification is void here. |
| `run_in_background: true` on `Task` | **Delete the parameter.** Subagents already run in the background; the parallelism comes from spawning several in one message, which is what the surrounding prose should say. |

## 7. Rewrites (re-authoring, not translation)

### 7.1 Transcript-reading skills: `recall`, `reflect`, `show-me-your-work`

These describe Cursor's transcript store (slug encoding, per-line message schema). Claude Code also stores sessions as JSONL under `~/.claude/projects/<escaped-cwd>/`, but the path-escaping convention and line schema differ, so a path swap yields skills that find the directory and misparse it.

Procedure: read real session JSONL; rewrite each skill's location and parsing instructions against the observed
schema; preserve upstream's privacy guardrail verbatim in spirit — *never glob across other projects' directories;
use only the active workspace's transcript path*. Then exercise the skills against a real transcript before
sign-off. This was the port's highest-risk work item and the draft's caution was justified.

**Observed schema** (derived by reading real session files, not documentation; now documented once in
`skills/poteto-mode/references/transcripts.md` and referenced by all five consumers rather than restated):

- **Location** `~/.claude/projects/<escaped-cwd>/<sessionId>.jsonl`, flat, one file per session. Upstream's three
  layouts (flat, nested `<id>/<id>.jsonl`, and `subagents/<child>.jsonl`) collapse to one.
- **Escaping** replaces `/`, `.` **and `_`** with `-`, keeping the leading separator and preserving case. The
  underscore is the trap: verified against all 19 real project directories on the development machine, a rule
  covering only `/` and `.` fails on one of them, and `worktree-audit.sh`'s upstream `sed 's#^/##; s#/#-#g'`
  additionally drops the leading separator that Claude Code keeps.
- **Not one message per line.** Twelve line types were observed; only `user` and `assistant` carry conversation.
  The rest is session metadata, hook output, attachments and file snapshots.
- **A `user` line is usually a tool result**, not something a human said — 95 of 102 in the session used for
  testing. Filtering human input means keeping `user` lines that have real text, no `tool_result` block, and no
  `isMeta: true`.
- **`message.content` is a string OR a list of blocks.** Assuming a list crashes on plain user turns; assuming a
  string silently drops every tool call.
- **Subagent turns are `isSidechain: true` inside the same file**, not separate files.
- `uuid`/`parentUuid` form a DAG, not a list — rewinds fork it, so file order is not conversation order.
- `attributionSkill` on `assistant` lines is how you verify a skill actually drove a turn rather than being merely
  cited. This is precisely what the `eval` playbook's chain-following check needs, and it has no upstream analogue.

**Acceptance:** every `jq` recipe in the reference must be executed against a real transcript. The human-turn
filter recovering 2 genuine prompts out of 102 `user` lines is the check that the line-type filtering is right;
merely locating the directory proves nothing.

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

**Note on `unslop` vs `deslop`:** they do not overlap and both ship. `deslop` strips slop out of *code*; `unslop` strips it out of *prose*. `poteto-mode`'s `references/plan.md` already invokes both in one line. No deduplication is needed.

### 9.2 `skills/control-cli/` and `skills/control-ui/` (from cursor-team-kit)

Copy verbatim — both are platform-neutral (tmux / PTY / inspector; Playwright / CDP / repo-native harnesses) and were confirmed to contain no Cursor references. Edits:

- control-ui: the single `verify-this` line → §6 substitution.
- Both: no new dependencies; keep the harness-reuse-first, no-unsolicited-installs stance.

These restore the shipping playbook's invariant — *live surface verification is the floor for a merge verdict* — with its original mechanism. The playbook lines referencing `control-cli`/`control-ui` "from cursor-team-kit" change attribution only.

## 10. Work items by component

**Verbatim (no edits):** all 21 `principle-*` skills; `tdd`, `no-comments`, `unslop`, `teach`, `technical-writing`, `typescript-best-practices`, `bro`, `blast-radius`, `figure-it-out`, `arena`'s reference files, `how`/`why`/`interrogate`/`reflect`/`architect` reference and prompt files except where §5/§6 terms appear; `poteto-mode/scripts/` (bun scripts run wherever bun is installed; note the nested `package.json` means Claude Code's automatic dependency install does not fire — deps install on first use, which is acceptable).

**Line edits:** `arena`, `swarm`, `interrogate`, `how`, `why`, `architect` (§5 models); `automate-me`, `create-verification-skill`, `maintain-verification-skill` (§4 paths, §6 create-skill); `comment-sicko` agent (none needed — verify only); `poteto-agent` (§3 frontmatter).

**Poteto-mode:** SKILL.md routing table (§6 substitutions; delete control-skill external attribution; delete built-in-babysit disambiguation note) and the five playbooks named in §8 plus `opening-a-pr` and `pause-safely` (§6).

**Delete:** `automations/` (benny), `setup-pstack`, all non-Anthropic model slugs, orchestrate's cloud/local partition prose, Cursor-built-in references, and the `readonly` / `run_in_background` Task parameters with their supporting prose (§6).

**Rewrite:** `recall`, `reflect`, `show-me-your-work` (§7.1); `deslop` policy pass (§7.2); `docs/guide/` (§3).

## 11. Validation and acceptance

1. `claude plugin validate . --strict` passes with zero warnings.
2. Load with `claude --plugin-dir .`; confirm every skill appears under `mstack:` and both agents appear in the @-mention typeahead.
3. Grep gate: implemented as a runnable `scripts/check-port.sh` rather than a prose checklist, so the acceptance
   criterion is executable. Zero matches for `cursor`/`Cursor`, `gpt-`, `grok`, `bugbot`, `benny`,
   `cursor-team-kit`, `.mdc`, bare `AskQuestion`, `is_background`, `environment: "cloud"`, and `pstack`.

   **Corrections to the draft's pattern list:**
   - `pstack` was missing entirely, despite 109 occurrences across 25 files at the start of the port.
   - `pstack` and `cursor` both need word boundaries. Unanchored, `pstack` matches `upstack` (which appears
     throughout the Graphite stacking prose and the watcher tests), and `cursor` matches `endCursor`, a legitimate
     GitHub GraphQL pagination field.
   - The gate needs a **presence assertion** (≥40 `SKILL.md`, exactly 21 `principle-*`). Without it, it passes
     vacuously on a repo where nothing has been ported yet, which is the state it is first run in.
   - `README.md` is exempt from the three attribution patterns (`cursor`, `cursor-team-kit`, `pstack`) and no
     others. Naming the upstream is what attribution *is*; exempting the whole file instead would drop the
     README's instructional content out of the gate.
   - One legitimate lowercase `cursor` (a text caret in `why/SKILL.md`) is reworded rather than allowlisted, and
     one local variable in `github.ts` is renamed, so the gate needs no allowlist mechanism at all.
4. Smoke tests: `/poteto-mode` on a trivial bug-fix in a scratch repo end to end; `/arena` with the three-seat panel; `/swarm` spawning haiku workers in background worktrees; `/create-verification-skill` writing to `.claude/skills/`; `/deslop` and `/no-comments` on a deliberately sloppy diff; `/control-cli` against a sample TUI via the tmux harness.

   Procedure, scratch-repo setup and per-test pass criteria: `docs/smoke-tests.md`. Verify each with `scripts/verify-smoke.sh`, which grades on the transcript rather than the reply.

   **Correction: these cannot be run headlessly.** 39 of the 46 skills are `disable-model-invocation: true`, and `claude -p` has no slash-command mechanism, so it can reach only 7 of them — excluding every item on this list except `/deslop` and `/control-cli`. Worse, the failure is silent: a headless `/bro` prompt produced correct, perfectly `/bro`-shaped prose while the transcript recorded no `Skill` tool call at all. Grading on output shape scores that a pass. `claude plugin eval` is the right tool and would remove the manual pass entirely, but is early-access gated.

   **Status: all seven PASS**, run 2026-08-20 by driving an interactive session through a tmux harness and grading every one on the transcript (`scripts/verify-smoke.sh`), never on the reply. Evidence per test:

   | # | Skill | Evidence |
   |---|---|---|
   | 1 | `/poteto-mode` | `attributionSkill` ×19; `sum.js` 6→10; red-first commits (test, then fix) |
   | 2 | `/arena` | candidates on `fable` + `opus`, cross-judge on `fable` after both finished; isolated candidate dirs |
   | 3 | `/swarm` | `general-purpose` × `haiku` × `isolation: worktree` ×2; parent re-verified and downgraded a worker's PASS |
   | 4 | `/create-verification-skill` | wrote `.claude/skills/verify-<app>/` with the four specified H2s; self-proved the skill |
   | 5 | `/deslop` | `attributionSkill` ×9; slop removed, behaviour preserved |
   | 6 | `/no-comments` | `attributionSkill` ×7; `Comment Sicko` subagent spawned |
   | 7 | `/control-cli` | PTY harness built, corroborated against a non-TTY pipe; cleaned up after itself |

   **Three defects were found, all of which had passed every static gate** (see the port's git history): `/poteto-mode` was an unknown command because the skill carried a human display name; `generalPurpose` survived in 9 places the gate had no pattern for; and `poteto-agent` could not locate the skill it is named for, degrading silently while still answering plausibly. Tests 2 and 3 are the first real evidence that §5's tier-diversity mitigation produces genuinely different models per seat rather than a collapsed panel. The plugin loads and every component registers (§11.2), but whether the workflows *behave* is unproven and remains the largest open risk in the port.

5. Bundled TypeScript: `bun test orch watch-pr` and `tsc --project watch-pr/tsconfig.json --noEmit --strict` both clean. The nested `package.json` means Claude Code's automatic dependency install does not fire, so `bun install` is a manual first step. Baseline 52 tests; 53 after the review-bot generalisation.

6. Link check: no internal Markdown link may dangle after the `setup-pstack` deletion and the `bugbot-triage.md` rename. Exclude `node_modules/`, which `bun install` creates and `.gitignore` covers.
7. Transcript trio (§7.1) exercised against a real session file — the acceptance bar is correct parsing, not merely finding the directory.
8. Install path check: repo consumable via `--plugin-dir`, as a `~/.claude/skills/` skills-directory plugin, and via `/plugin marketplace add MatrixMagician/mstack` (the manifest is added per §3).

## 12. Decisions, resolved

- **`docs/guide/` is rewritten in place for v1.** The draft framed this as a large call; it is not. The guide
  carries only 7 `cursor` hits across 11 files and its images are decorative JPEGs, not Cursor UI screenshots. The
  one page needing real re-authoring is `01-setup.md`, which existed to walk through `/setup-pstack`; it becomes a
  page explaining why there is nothing to configure.
- **`claude-code-action` is the worked example** in the generalised triage reference. It is the bot an mstack repo
  most plausibly runs, and one concrete example keeps 9.4KB of triage logic grounded. The rubric itself classifies
  on what a comment claims and what the code shows, never on the author, so it holds for any bot.
- **No per-user model override file ships in v1**, as drafted. Inline tier aliases are the defaults, and every
  skill keeps its fallback sentence pointing at an optional `.claude/rules/mstack-models.md` that need not exist.

## 13. Accepted losses

Stated plainly here and in `NOTICE.md` rather than left implicit:

- **Panel independence is genuinely weaker than upstream's.** Tier spread, effort spread and persona
  differentiation are a substitute for decorrelated blind spots across labs, not an equivalent. No wording fixes
  this; a Claude-only panel is the constraint the port accepts.
- **The interactive smoke tests (§11.4) are unrun**, so workflow behaviour is unproven.
- **Upstream sync is file-level diffing only.** `git-filter-repo` rewrites SHAs, so upstream commits will not
  cherry-pick by hash.
