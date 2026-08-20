# Smoke tests (SPEC.md §11.4)

The interactive acceptance pass for the port. These cannot be scripted — read the next
section before trying, because the obvious approach reports passes that did not happen.

## Why this is interactive-only

**`claude -p` cannot run most of these skills.** 39 of mstack's 46 skills are
`disable-model-invocation: true`, meaning user-invoked only. Headless mode has no slash-command
mechanism, so those skills are unreachable and a `/poteto-mode ...` prompt is consumed as plain
text. Only these 7 are model-invocable:

```
how  why  deslop  unslop  control-cli  control-ui  typescript-best-practices
```

That excludes every skill on the checklist except `/deslop` and `/control-cli`.

**The failure is silent, not loud.** A headless `/bro explain this` returned correct, perfectly
`/bro`-shaped prose — plain language, no jargon, right diagnosis — while the transcript recorded
no `Skill` tool call at all. The model simply answered in that register. Judging by output shape
would have scored it a pass. This is the **principle-prove-it-works** failure the plugin itself
warns about, so verify against the transcript (below), never against the reply.

`claude plugin eval` is the right tool for this and would remove the manual work entirely — case
files, LLM graders, a no-plugin baseline arm, cost ceilings. It is currently early-access gated.
Re-check `claude plugin eval --help`; if it runs for you, prefer it and replace this document.

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
| 1 | `/poteto-mode sum.js drops the last element. repro first, then fix and verify.` | First todo is "read the Principles section"; the Bug-fix playbook's steps are copied in verbatim; a skipped step stays listed as `skip: <reason>`; the fix is proven by running it, not asserted |
| 2 | `/arena two designs for a safer sumAll. compare them.` | Three runners on `fable`, `opus`, `sonnet` — not three of one tier; each writes to its own path; a cross-judge runs after all candidates finish, not alongside |
| 3 | `/swarm check both js files for off-by-ones. one worker each.` | Workers spawn on `haiku` with `isolation: "worktree"`; one aggregated verdict |
| 4 | `/create-verification-skill` | Writes to `.claude/skills/verify-<app>/` and nowhere else — the upstream skill targeted an editor-specific directory, so confirm the path rather than assuming the remap took; produces a feature map |
| 5 | `/deslop sloppy.js` | Narrating comments, unsupported guards and the dead `addLegacy` path are gone; `add`'s behaviour is unchanged |
| 6 | `/no-comments sloppy.js` | A `comment-sicko` subagent spawns |
| 7 | `/control-cli` against any local TUI | Drives it through the tmux harness; installs nothing unsolicited |

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

**Last run: 2026-08-20 — all seven PASS.** That run found three defects every static gate had
passed: `/poteto-mode` registered as `/mstack:Poteto Mode` (a human display name in frontmatter),
the upstream camelCase spelling of `general-purpose` surviving in nine places the gate had no pattern for, and `poteto-agent` unable to
locate the skill it is named for — degrading silently while still answering plausibly.

Re-run this checklist after any change to skill frontmatter, agent definitions, or model roles.
Those are exactly the surfaces where a change passes every static gate and still breaks invocation.
