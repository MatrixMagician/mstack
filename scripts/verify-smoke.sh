#!/usr/bin/env bash
# Did the skill actually fire, or did the model just answer in that style?
# Reads the CURRENT directory's newest transcript and reports which skills really
# drove a turn. Run it from the scratch repo, after each smoke-test prompt.
#
# Why this exists: a /bro run in headless mode produced perfectly bro-shaped prose
# with no Skill tool call at all. Output shape is not evidence (principle-prove-it-works).
set -uo pipefail
command -v jq >/dev/null || { echo "needs jq"; exit 2; }

dir="$HOME/.claude/projects/$(pwd | tr './_' '-')"
[ -d "$dir" ] || { echo "no transcripts for $(pwd)"; exit 1; }
f=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1)
[ -n "$f" ] || { echo "no .jsonl in $dir"; exit 1; }

echo "transcript: $f"
echo
echo "skills that drove a turn (attributionSkill):"
got=$(jq -r 'select(.type=="assistant" and .attributionSkill) | .attributionSkill' "$f" | sort | uniq -c)
[ -n "$got" ] && echo "$got" || echo "  (none — no skill fired)"
echo
echo "Skill tool invocations:"
inv=$(jq -r 'select(.type=="assistant") | .message.content[]?
             | select(.type=="tool_use" and .name=="Skill") | .input.skill' "$f" | sort | uniq -c)
[ -n "$inv" ] && echo "$inv" || echo "  (none)"
echo
echo "subagents spawned (Task/Agent calls):"
sub=$(jq -r 'select(.type=="assistant") | .message.content[]?
             | select(.type=="tool_use" and (.name=="Task" or .name=="Agent"))
             | "\(.input.subagent_type // "?") \(.input.model // "-")"' "$f" | sort | uniq -c)
[ -n "$sub" ] && echo "$sub" || echo "  (none)"
echo
[ -n "$got$inv" ] || { echo "VERDICT: no mstack skill fired. Output shape proves nothing."; exit 1; }
echo "VERDICT: a skill fired — check above that it is the one you invoked."
