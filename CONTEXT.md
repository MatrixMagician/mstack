# mstack

mstack is a Claude Code plugin of agent workflows. You give it a goal and a way to check it; it matches a rehearsed procedure, applies named rules to the decisions along the way, and proves the result before calling it done. This glossary fixes the words those workflows use.

## Language

### The plugin surface

**Skill**:
A directory under `skills/` holding a `SKILL.md` the agent reads in full when it fires. The unit of distribution.
_Avoid_: command, tool, prompt

**Mode**:
A skill that stays in effect across turns instead of running once. `poteto-mode` is the only mode mstack ships; a user can author their own. Unqualified, "mode" always means this. The two narrower senses are always qualified: a **babysit mode** (`drive`, `background`, `threads-only`, `check`) is how much authority a babysit run has, and a **watch mode** (`single`, `stack`, `queued-stack`) is what the watcher is pointed at.
_Avoid_: persona, style, profile

**Principle**:
A named rule that governs a class of decision, shipped as its own skill but never invoked directly. Its name is the steering handle — saying it mid-task redirects the work, and a citation only counts when it names the decision it changed.
_Avoid_: rule, guideline, best practice, convention

**Playbook**:
A rehearsed procedure for one kind of task, owned by `poteto-mode`. Its steps become the todo list, and a skipped step stays visible with its reason.
_Avoid_: workflow, recipe, procedure, template

**Route**:
`poteto-mode` matching a prompt to the playbook that fits it. The signal is the goal and its check, not a named skill.
_Avoid_: dispatch, triage

**Slop**:
Writing or code that reads as machine-produced — AI tells in prose, workaround code and defensive noise in source. Cut from prose by `unslop`, from code by `deslop`.
_Avoid_: boilerplate, filler, cruft

### Delegation

**Coordinator**:
The standing chat that owns a program end to end: it frames the work, authors briefs, drains completions, and makes the judgment calls. It never writes code.
_Avoid_: orchestrator, manager, lead

**Worker**:
A spawned agent that owns one unit and works in its own worktree. One writer per branch.
_Avoid_: subagent (too general), child, delegate

**Verifier**:
An agent that judges whether a unit works, run on a different tier from the worker that built it and never the same agent. Its independence is what makes a verdict mean anything.
_Avoid_: reviewer, checker, QA

**Brief**:
The complete instruction a spawned agent receives — goal, scope, context, acceptance, verify, timebox, forbidden, report, standing orders. A worker cannot ask a question, so an incomplete brief fails quietly. The brief is the coordinator's product.
_Avoid_: prompt, spec, task description

**Standing orders**:
The numbered constraints that apply to every agent in a program, pasted verbatim into every spawn and every resume because directives decay across resumes.
_Avoid_: preferences, config, rules

**Unit**:
The smallest piece of program work that carries its own branch, PR, and verdict.
_Avoid_: task, ticket, item, chunk

**Track**:
A lane of related units under one owner.
_Avoid_: workstream, epic, phase

**Wave**:
A rolling window of concurrently in-flight agents, refilled as children finish rather than run as a blocking batch.
_Avoid_: batch, round, sprint

**Drain**:
Processing accumulated completions at a chosen point. Completions are queue events, not interrupts.
_Avoid_: poll, flush, collect

**Inbox**:
Where completions wait as pointers until the next drain.
_Avoid_: queue, mailbox

**Ledger**:
The append-only record of which verdict each unit's head SHA earned, and who produced it.
_Avoid_: log, registry, audit table

**Gate**:
A check that must pass before work proceeds — the lint, typecheck, and test run, a regression harness, a safety check ahead of a destructive step. A gate is something an agent can run and read.
_Avoid_: guard, barrier, hurdle

**Decision gate**:
A decision only the human can make, parked in durable form so a flood of completions cannot lose it — the question, its options, and what happens on no answer. Always named in full; a bare "gate" is the check above.
_Avoid_: approval, checkpoint, blocker

**Trail**:
The auditable record of what was decided and why, written as the run happens so it survives the chat.
_Avoid_: log, history, notes

### Merge and shipping

**Stack**:
A chain of PRs, each based on the one below it, with the root on trunk.
_Avoid_: chain, train, series

**Frontier**:
The lowest unmerged PR in a stack. Nothing above it matters until it merges.
_Avoid_: bottom, head, tip, base

**Merge-ready**:
GitHub itself agrees the PR can merge. Not the same as every check reporting green.
_Avoid_: green, ready, mergeable

**Blocker**:
What stands between the frontier and merge-ready — a conflict, an open review thread, a failing check, or a PR that is not eligible to merge at all (closed, draft, changes-requested).
_Avoid_: issue, problem, failure

**Arm**:
To enable merge-when-ready through Graphite. Arming is not merging; the queue drains on its own afterwards, and touching the stack mid-drain breaks it.
_Avoid_: enable, queue, trigger

**Land**:
To merge a PR that holds a passing verdict, working up from the root and stopping at the first gap.
_Avoid_: merge (too general), ship, deploy

**Watcher**:
The tool that polls a PR or stack and reports its merge state and blocker. Its report is fact about mergeability, never about correctness.
_Avoid_: monitor, poller, bot

**Babysit**:
Driving a stack to merge-ready — fixing blockers, triaging review threads, keeping the frontier green. It ends where merging begins.
_Avoid_: watch, monitor, nurse

**Ship**:
Deciding what is safe to merge and landing it. Begins where babysitting ends, because green is not safe.
_Avoid_: release, deploy, land (land is the act, ship is the phase)

### Verification

**Verdict**:
One independent verifier's judgment on whether a change actually works, recorded against a specific head SHA. CI green is not a verdict, and an approving bot review is not a verdict. A verdict goes stale the moment the SHA it describes is rewritten.
_Avoid_: status, result, sign-off, approval

**Evidence**:
What the verifier ran and observed, kept with the verdict so a reader can rerun it rather than trust it.
_Avoid_: proof, output, logs

**Merge state**:
The watcher's read on whether a PR can merge. Distinct from a verdict, which is about correctness.
_Avoid_: verdict, status

**Predicate**:
The countable condition that defines done for a run, stated before the work starts.
_Avoid_: goal, definition of done, success criteria
