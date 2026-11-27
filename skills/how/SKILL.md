---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

# How

Explore the codebase to answer "how does X work?" questions.

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

## 1. Explain

Spawn one `Agent` subagent with `subagent_type: "Explore"` that explores and explains in one pass. Set `model` to the `judgment and prose` line in `.claude/rules/mstack-models.md`, or `fable` if the file or the line is missing, and leave `model` unset when the value is `auto` or `inherit-parent`. Set `effort` per **Effort by tier** in [`poteto-mode`](../poteto-mode/SKILL.md). Give it the user's question and this brief:

> You are writing an architectural explanation for a senior engineer. Explore the codebase and write an explanation that a senior engineer unfamiliar with this area could read and walk away with a solid mental model. They should understand the architecture well enough to start working in it confidently. Read and report only. Do not edit files.

## 2. Present

Present the subagent's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.
