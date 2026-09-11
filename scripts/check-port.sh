#!/usr/bin/env bash
# Port acceptance gate (SPEC.md §11.3). Fails if any banned string survives the port,
# or if shipped content changed since the last release tag without a plugin.json version bump.
# Run from the repo root. Exit 0 = clean.
set -uo pipefail
cd "$(dirname "$0")/.."

# Files that are allowed to name what we ported away from.
EXCLUDE=(':(exclude)LICENSES/*' ':(exclude)NOTICE.md' ':(exclude)SPEC.md'
         ':(exclude)scripts/check-port.sh' ':(exclude)AGENTS.md' ':(exclude)docs/agents/*')

# pattern<TAB>description<TAB>extra path exclusions (space separated, optional).
# README.md is exempt from the three attribution patterns only: naming the upstream project
# is what a NOTICE is for. It stays subject to every other pattern.
PATTERNS=(
  '\b[Cc]ursor\b|CURSOR	Cursor references (§11.3, endCursor is a GraphQL field and exempt)	:(exclude)README.md'
  'gpt-|grok	non-Anthropic model slugs (§5)'
  '[Bb]ugbot	Bugbot-specific mechanics (§6)'
  'benny	benny automations (§10, deleted)'
  'cursor-team-kit	external plugin attribution (§9)	:(exclude)README.md'
  '\.mdc	Cursor rule-file extension (§4)'
  '(^|[^[:alnum:]_-])AskQuestion	bare AskQuestion, want AskUserQuestion (§6)'
  'is_background	Cursor agent frontmatter, want background (§3)'
  'generalPurpose	Cursor subagent_type, want general-purpose (§6)'
  '/(home|Users)/[a-z]	hardcoded personal home path (leaks a username to every installer)'
  'run_in_background	Cursor Task param with no Claude Code equivalent (§6)'
  'environment: *"?cloud	Cursor cloud execution (§8)'
  '\bpstack\b	old plugin name (§2)	:(exclude)README.md'
  'subagent_type: "(poteto-agent|Comment Sicko)"	bare plugin agent name, want the mstack: prefix (§6)'
  '\bTask\b	Cursor Task tool, want Agent (§6; TaskOutput and TaskStop are real tools and never match)	:(exclude)scripts/verify-smoke.sh'
)

fail=0

# Presence check: the gate must not pass vacuously on an unported repo.
expect_skills=40
n_skills=$(find skills -name SKILL.md 2>/dev/null | wc -l)
n_principles=$(find skills -maxdepth 1 -type d -name 'principle-*' 2>/dev/null | wc -l)
if [ "$n_skills" -lt "$expect_skills" ] || [ "$n_principles" -ne 23 ]; then
  fail=1
  printf '\033[31mFAIL\033[0m content present: %s SKILL.md (want >=%s), %s principle-* (want 23)\n' \
    "$n_skills" "$expect_skills" "$n_principles"
else
  printf '\033[32mok\033[0m   content present: %s SKILL.md, %s principle-*\n' "$n_skills" "$n_principles"
fi

for entry in "${PATTERNS[@]}"; do
  pat="${entry%%	*}"; rest="${entry#*	}"; desc="${rest%%	*}"
  extra=(); [ "$rest" != "$desc" ] && read -r -a extra <<< "${rest#*	}"
  hits=$(git grep --untracked -nIE "$pat" -- . "${EXCLUDE[@]}" "${extra[@]}" 2>/dev/null)
  if [ -n "$hits" ]; then
    fail=1
    printf '\n\033[31mFAIL\033[0m %s\n' "$desc"
    printf '%s\n' "$hits" | head -20
    n=$(printf '%s\n' "$hits" | wc -l)
    [ "$n" -gt 20 ] && printf '  ... and %d more\n' "$((n - 20))"
  else
    printf '\033[32mok\033[0m   %s\n' "$desc"
  fi
done

SHIPPED=(skills agents hooks)

# claude plugin update compares plugin.json's version, so an unbumped release leaves
# every installer on the stale cache.
tag=$(git describe --tags --abbrev=0 --match 'mstack--v*' --match 'v*' 2>/dev/null)
if [ -z "$tag" ]; then
  printf '\033[32mok\033[0m   release version: no release tag reachable, nothing to compare\n'
else
  released=$(git show "$tag:.claude-plugin/plugin.json" | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p')
  current=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' .claude-plugin/plugin.json)
  changed=$(git diff --name-only "$tag" -- "${SHIPPED[@]}")
  if [ -n "$changed" ] && [ "$released" = "$current" ]; then
    fail=1
    n=$(printf '%s\n' "$changed" | wc -l)
    printf '\n\033[31mFAIL\033[0m release version: %d shipped files changed since %s but plugin.json still says %s\n' \
      "$n" "$tag" "$current"
    printf '%s\n' "$changed" | head -20
    [ "$n" -gt 20 ] && printf '  ... and %d more\n' "$((n - 20))"
  else
    printf '\033[32mok\033[0m   release version: %s (last tag %s)\n' "$current" "$tag"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "grep gate: clean"
else
  echo "grep gate: FAILED"
fi
exit "$fail"
