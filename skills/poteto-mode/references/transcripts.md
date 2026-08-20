# Claude Code transcripts

Where session transcripts live, what the lines actually are, and how to read them without
misparsing. Every rule here was derived by reading real session files, not from documentation.

## Location

```
~/.claude/projects/<escaped-cwd>/<sessionId>.jsonl
```

One file per session, flat in the directory. There is no per-session subdirectory and no
`agent-transcripts/` level.

`<escaped-cwd>` is the absolute workspace path with **`/`, `.`, and `_` each replaced by `-`**.
Case is preserved. The underscore is easy to miss and silently breaks the lookup on any path
containing one:

| cwd | directory |
|---|---|
| `/home/you/proj` | `-home-you-proj` |
| `/home/you/.config/app` | `-home-you--config-app` |
| `/home/you/.npm/_npx/abc/node_modules/x` | `-home-you--npm--npx-abc-node-modules-x` |

Derive it rather than assembling it by hand:

```bash
dir="$HOME/.claude/projects/$(pwd | tr './_' '-')"
ls -t "$dir"/*.jsonl | head
```

Every message line also carries its own `cwd`, so you can confirm you opened the right project
before trusting anything you read.

**Privacy guardrail.** Read only the active workspace's directory. Never glob across
`~/.claude/projects/*/` — that reads private chats from unrelated projects. This rule is
inherited from upstream unchanged and is not negotiable for convenience.

## Line types

A transcript is **not** one chat message per line. Of the twelve line types observed, only two
carry conversation. Filter on `type` before anything else, or you will parse session metadata as
dialogue.

| `type` | What it is |
|---|---|
| `user` | A user turn **or** a tool result being fed back. See below — this distinction matters. |
| `assistant` | An assistant turn: text, thinking, and tool calls. |
| `system` | Hook output, errors, and turn-level metadata (`subtype`, `level`, `toolUseID`). |
| `attachment` | Injected context: hook output, skill/agent listings, token reminders. Not dialogue. |
| `file-history-snapshot` | Editor file state for undo. Never dialogue. |
| `queue-operation` | Prompts the user queued mid-turn. |
| `mode`, `permission-mode`, `ai-title`, `last-prompt`, `atis-latch`, `bridge-session` | Small session-metadata records, often one per session. Skip them. |

## Message lines

Both `user` and `assistant` lines carry a `message` object holding an Anthropic API message —
`role` plus `content`.

**`content` is either a string or a list of blocks.** Handle both; assuming a list crashes on
plain user turns, and assuming a string silently drops every tool call.

Block types seen in practice:

| Block | On | Holds |
|---|---|---|
| `text` | both | Visible prose. |
| `thinking` | assistant | Reasoning. Treat as private; never quote it back to a user. |
| `tool_use` | assistant | `name`, `input`, `id`. This is what the agent actually did. |
| `tool_result` | user | The result, correlated to a `tool_use` by `tool_use_id`. |

A `user` line whose only block is a `tool_result` is **not** something the human said. To read
what a person actually typed, keep `user` lines that have real text and no `tool_result`, and
drop lines carrying `isMeta: true`. `promptSource` (`typed`, `suggestion_accepted`, `sdk`)
distinguishes genuine typed input where present.

Useful fields on message lines:

- `uuid` / `parentUuid` — thread the conversation. It is a DAG, not a list: rewinding or editing
  a prompt forks it, so the file order is not necessarily the conversation order. Walk parent
  links back from the last line to get the live branch.
- `isSidechain: true` — the line belongs to a subagent, not the main thread. Separate these
  before summarising a session, or a subagent's work reads as the parent's.
- `timestamp`, `cwd`, `gitBranch`, `version` — per line.
- `toolUseResult` (on `user` lines) — the structured tool result alongside the content block.
- `attributionSkill` / `attributionPlugin` / `effort` (on `assistant` lines) — which skill drove
  the turn. This is how you verify a skill was actually applied rather than merely cited.

## Reading recipe

```bash
# the active project's sessions, newest first (never by UUID name)
dir="$HOME/.claude/projects/$(pwd | tr './_' '-')"
ls -t "$dir"/*.jsonl

# what the human actually asked, in one session
jq -r 'select(.type=="user" and (.isMeta|not) and (.isSidechain|not))
       | .message.content
       | if type=="string" then . else (.[]|select(.type=="text").text) end' "$dir/<sessionId>.jsonl"

# what the agent actually did
jq -r 'select(.type=="assistant") | .message.content[]?
       | select(.type=="tool_use") | "\(.name) \(.input|tostring[0:120])"' "$dir/<sessionId>.jsonl"

# which skills drove the run
jq -r 'select(.type=="assistant" and .attributionSkill) | .attributionSkill' "$dir/<sessionId>.jsonl" | sort -u
```

Grep to find the sessions worth opening, then read only the matching regions. A long transcript
is exactly the payload that belongs in a subagent, not the main thread (the
**principle-guard-the-context-window** skill).
