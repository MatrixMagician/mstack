# Set up mstack

In this page you install the plugin and run your first task. There is no model configuration step: every skill names a Claude Code tier alias inline, and aliases track the current release.

## Install the plugin

In Claude Code, run:

```text
/plugin marketplace add MatrixMagician/mstack
/plugin install mstack
```

Claude Code confirms the plugin is installed, and every skill appears under the `mstack:` namespace. To try a local checkout instead, start Claude Code with `claude --plugin-dir /path/to/mstack`.

## Models, and why there's nothing to pick

Each skill names its own model per role: `sonnet` for code, `opus` for precisely-specified sequences, `fable` for prose and judgment, `haiku` for cheap fan-out, and a `fable` / `opus` / `sonnet` panel for reviews. These are tier aliases rather than pinned versions, so they follow the current release of each tier and never go stale.

If you do want to override a role, write `.claude/rules/mstack-models.md` with one line per role:

```text
swarm workers: haiku
arena runners: fable, opus, sonnet
interrogate reviewers: fable, opus, sonnet
```

You only override what you care about. A role with no line keeps the skill's default; delete a line to restore it. Set a role to `inherit-parent` or `auto` and mstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model name. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size.

One caveat carried over from upstream: mstack's panels all draw on one model family, so they cannot rely on different labs having different blind spots. Keep any override spread across tiers rather than collapsing a panel onto a single one.

## Set up a way to prove app behavior

mstack's verification skills assume your project has some scripted way to drive the real app. If yours has neither a `verify-*` skill nor an existing harness, run [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

It writes `.claude/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does, and proves the skill works once before handing it over. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. `/poteto-mode` is sticky. It stays on for the conversation until you opt out by saying so.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
