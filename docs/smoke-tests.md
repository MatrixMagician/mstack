# Smoke tests (SPEC.md §11.4)

The interactive acceptance pass for the port. These cannot be scripted — read the next
section before trying, because the obvious approach reports passes that did not happen.

## Why this is interactive-only

**`claude -p` cannot run most of these skills.** 46 of mstack's 58 skills are
`disable-model-invocation: true`, meaning user-invoked only. Headless mode has no slash-command
mechanism, so those skills are unreachable and a `/swarm ...` prompt is consumed as plain
text. Only these 12 are model-invocable:

```
poteto-mode  tdd  architect  arena  interrogate  how  why
deslop  unslop  control-cli  control-ui  typescript-best-practices
```

That excludes rows 3, 4, 6, 8, and 9 of the checklist, and the SessionStart hook now fires
`poteto-mode` on a non-trivial prompt in headless mode without the command being typed.

**The failure is silent, not loud.** A headless `/bro explain this` returned correct, perfectly
`/bro`-shaped prose — plain language, no jargon, right diagnosis — while the transcript recorded
no `Skill` tool call at all. The model simply answered in that register. Judging by output shape
would have scored it a pass. This is the **principle-prove-it-works** failure the plugin itself
warns about, so verify against the transcript (below), never against the reply.

`claude plugin eval` is the right tool for this and would remove the manual work entirely — case
files, LLM graders, a no-plugin baseline arm, cost ceilings. It runs now, and `evals/program-routing/`
is the first case. Issue 69 moves these rows onto it.

## Set up a scratch repo

```bash
mkdir /tmp/mstack-smoke && cd /tmp/mstack-smoke && git init -q

cat > sum.js <<'JS'
// off-by-one: drops the last element
function sumAll(xs) {
  let t = 0;
  for (let i = 0; i < xs.length - 1; i++) t += xs[i];
  return t;
}
console.log(sumAll([1, 2, 3, 4]));  // prints 6, should be 10
JS

cat > sloppy.js <<'JS'
// Helper function that adds two numbers together
function add(a, b) {
  // Check if inputs are valid
  if (a === undefined || a === null) return 0;   // defensive guard
  if (b === undefined || b === null) return 0;   // defensive guard
  // Return the sum
  return a + b;
}
// Legacy path kept for backwards compatibility
function addLegacy(a, b) { return add(a, b); }
module.exports = { add, addLegacy };
JS

git add -A && git commit -qm seed
claude --plugin-dir /path/to/mstack
```

`sum.js` carries a real off-by-one; `sloppy.js` carries narrating comments, unsupported guards,
and a dead compatibility path — one target each for the fix workflows and the cleanup workflows.

## The checklist

Run `scripts/verify-smoke.sh` from the scratch repo after **each** prompt.

| # | Prompt | Passes when |
|---|---|---|
| 1 | `/poteto-mode sum.js drops the last element. repro first, then fix and verify.` | The Bug-fix playbook's steps are copied into the todolist, or into the reply when the session has no todo tool; the fix is proven by running it, not asserted |
| 2 | `/arena a safer sumAll. compare the designs.` | Three runners on `fable`, `opus`, `sonnet` — not three of one tier; each writes to its own path; a cross-judge runs after all candidates finish, not alongside |
| 3 | `/swarm check both js files for off-by-ones. one worker each.` | Workers spawn on `haiku` with `isolation: "worktree"`; one aggregated verdict |
| 4 | `/create-verification-skill` | Writes inside the repo only to `.claude/skills/verify-<app>/` — the upstream skill targeted an editor-specific directory, so confirm the path rather than assuming the remap took; run evidence may go to a location outside the repo that survives cleanup; produces a feature map |
| 5 | `/deslop sloppy.js` | Narrating comments and the dead `addLegacy` path are gone; a guard stays only when removing it changes `add`'s behaviour, which is otherwise unchanged |
| 6 | `/no-comments sloppy.js` | A `Comment Sicko` subagent spawns |
| 7 | `/control-cli` against any local TUI | Drives it through the tmux harness; installs nothing unsolicited |
| 8 | `/create-formal-verification-skill sum.js. sumAll must return the sum of every element of its input.` | Writes the generated skill under `.claude/skills/`; says no verifier runs on JavaScript and tests the real `sumAll` with generated inputs, not a hand model; the generated skill records the covered file and function and a sync commit; the check is shown failing on a broken variant; while `sum.js` still carries the off-by-one, the run reports the counterexample in the code's terms and leaves `sum.js` unchanged |
| 9 | `/maintain-formal-verification-skill` after a commit that changes `sumAll` (the row 1 fix is one) | Runs the check as-is before editing anything; reads every commit to `sum.js` since the recorded sync commit; names each check `in sync`, `updated`, `bug`, or `blocked` and says which failures were drift and which were bugs; edits nothing outside the verify skill's directory; moves the sync commit only for a check that is in sync or updated |

Rows 8 and 9 depend on order. Run 8 before 1 to see the finding path, where the property fails on the seeded bug and the run reports it without touching `sum.js`. Run 9 after 1, and first commit the row 8 output and the row 1 fix, because row 1 does not commit unasked. That gives row 9 a commit to `sumAll` to read.

Tests 2 and 3 are where the port's model policy is actually on trial: confirm the reported
`model` values differ across seats. A panel that quietly collapsed onto one tier still produces
plausible output, and it is the failure §5's mitigation exists to prevent.

## Verify

```bash
scripts/verify-smoke.sh
```

Reads the scratch directory's newest transcript and reports which skills genuinely drove a turn
(`attributionSkill`), which `Skill` tool calls fired, and every subagent with its `subagent_type`
and `model`. Exits non-zero when nothing fired. The transcript format it relies on is documented
in [`skills/poteto-mode/references/transcripts.md`](../skills/poteto-mode/references/transcripts.md).

Record the result for each numbered test.

**Last run: 2026-11-27 at `9dd84d1`. Six PASS, two FAIL on row text no skill promises, one INCONCLUSIVE.**
Evidence per test, from `attributionSkill` and the recorded `Agent` calls. Claude Code 2.1.332, one
fresh session per row, run in the order 8, 1, 9, 2-7:

| # | Skill fired | Evidence |
|---|---|---|
| 1 | `mstack:poteto-mode` ×21 | INCONCLUSIVE. Read `playbooks/bug-fix.md` first; repro `node sum.js` printed `6` and the row 8 check failed on `sumAll([1])`; after the fix `10` and `PASS sumAll: 980800 inputs`. No todolist: the session had no todo tool (no `TodoWrite`, no `TaskCreate`, loaded or deferred), so the copy-steps clause could not run. Made the one-line fix itself and said it skipped the delegation step |
| 2 | `mstack:arena` ×14 | FAIL on the row text, not the skill. The prompt asks for two designs and got two runners, `fable` and `opus`, both `mstack:poteto-agent` at `high`; no collapse. Each wrote to its own worktree `/tmp/arena-safer-sumall/candidate-N`; the `fable` cross-judge spawned at 00:48:01, after both finished (00:43:22, 00:47:44) |
| 3 | `mstack:swarm` ×9 | Two `general-purpose` workers on `haiku` at `low` with `isolation: "worktree"`, one per file, one aggregated table, no dropouts |
| 4 | `mstack:create-verification-skill` ×49 | Every write inside the repo landed under `.claude/skills/verify-mstack-smoke/`, with a `features/` map of five files; run evidence goes to `~/.local/state/verify-mstack-smoke/`, the location the skill must name so proof survives cleanup |
| 5 | `mstack:deslop` ×9 | Ran `grep -rn "addLegacy"` before cutting it; narrating comments and `addLegacy` gone; the two guards folded into one `a == null \|\| b == null`, kept because dropping them changes `add(null, 5)`; `add` identical to the seed on 225 probed input pairs |
| 6 | `mstack:no-comments` ×6 | `mstack:Comment Sicko` subagent spawned on `fable` at `high` |
| 7 | `mstack:control-cli` ×8 | Drove `top` in its own tmux session, polling for `PID USER` at 0.25 s, confirmed exit `0` on `q` with `remain-on-exit`, installed nothing, killed only the `cli-harness-top-*` sessions it made |
| 8 | `mstack:create-formal-verification-skill` ×18 | FAIL on "writes only under `.claude/skills/`": the harness went to `verify/sumAll.check.mjs`, which the skill does not forbid. The rest holds: said no verifier runs on JavaScript, ran the real `sumAll` on 980,800 generated inputs, recorded `sum.js`/`sumAll` and sync commit `5cfb49c`, caught three broken copies and a scratch break in `sum.js`, reported `sumAll([1]) returned 0, expected 1`, and left `sum.js` unchanged |
| 9 | `mstack:maintain-formal-verification-skill` ×23 | Ran the check before any edit (PASS); read `fbb3672` and `b8170db` since `5cfb49c`; named the check `in sync`, with no bugs and one drift (the stale expected-result section); edited only `.claude/skills/verify-sumall/SKILL.md`; moved the sync commit to `b8170db` |

Rows 2 and 8 fail on what the row asks, not on what the skill does. Row 2's prompt says "two designs",
and the run sized the field to that count, so a three-tier field needs a prompt that
names no count. Row 8's "writes only under `.claude/skills/`" is stricter than the skill, which places
only the generated skill there. Row 1 needs a todo tool the current Claude Code session does not offer.
Row 9 needs a commit the row 1 run will not make unasked, so the runner commits the row 8 output and
the row 1 fix as two commits first.

This run is recorded against the row text it ran under. Rows 1, 2, 4, 5, and 8 above were then corrected to what the skills promise, and the row order note now says who makes the row 9 commit.

The 2026-08-21 run found two wrong rows.

**Row 5 asked for something `deslop` had never promised.** Its focus areas were comments,
defensive checks, `any` casts, and nesting, so a compliant run left the exported `addLegacy`
alone. Resolved by scoping dead paths into the skill rather than dropping the row: `deslop` now
removes pass-through wrappers and compatibility shims nothing calls, and must search the repo for
every reference before cutting one. Re-verified on a fresh scratch repo -- it ran
`grep -rn "addLegacy"` first, then removed the function and its export, leaving `add` identical on
every probed input.

**Row 6 spelled the agent `comment-sicko`.** It is registered and documented everywhere else as
`Comment Sicko`, which is what `subagent_type` must match. Fixed in the row above.

The 2026-08-20 run found three defects every static gate had
passed: `/poteto-mode` registered as `/mstack:Poteto Mode` (a human display name in frontmatter),
the upstream camelCase spelling of `general-purpose` surviving in nine places the gate had no pattern for, and `poteto-agent` unable to
locate the skill it is named for — degrading silently while still answering plausibly.

Re-run this checklist after any change to skill frontmatter, agent definitions, or model roles.
Those are exactly the surfaces where a change passes every static gate and still breaks invocation.
