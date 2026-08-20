#!/usr/bin/env bash
# Port acceptance gate (SPEC.md §11.3). Fails if any banned string survives the port.
# Run from the repo root. Exit 0 = clean.
set -uo pipefail
cd "$(dirname "$0")/.."

# Files that are allowed to name what we ported away from.
EXCLUDE=(':(exclude)LICENSES/*' ':(exclude)NOTICE.md' ':(exclude)SPEC.md'
         ':(exclude)scripts/check-port.sh' ':(exclude)AGENTS.md' ':(exclude)docs/agents/*')

# pattern<TAB>description. ERE, case-sensitive unless the pattern says otherwise.
PATTERNS=(
  '[Cc]ursor|CURSOR	Cursor references (§11.3)'
  'gpt-|grok	non-Anthropic model slugs (§5)'
  '[Bb]ugbot	Bugbot-specific mechanics (§6)'
  'benny	benny automations (§10, deleted)'
  'cursor-team-kit	external plugin attribution (§9)'
  '\.mdc	Cursor rule-file extension (§4)'
  '(^|[^[:alnum:]_-])AskQuestion	bare AskQuestion, want AskUserQuestion (§6)'
  'is_background	Cursor agent frontmatter, want background (§3)'
  'environment: *"?cloud	Cursor cloud execution (§8)'
  'pstack	old plugin name (§2)'
)

fail=0

# Presence check: the gate must not pass vacuously on an unported repo.
expect_skills=40
n_skills=$(find skills -name SKILL.md 2>/dev/null | wc -l)
n_principles=$(find skills -maxdepth 1 -type d -name 'principle-*' 2>/dev/null | wc -l)
if [ "$n_skills" -lt "$expect_skills" ] || [ "$n_principles" -ne 21 ]; then
  fail=1
  printf '\033[31mFAIL\033[0m content present: %s SKILL.md (want >=%s), %s principle-* (want 21)\n' \
    "$n_skills" "$expect_skills" "$n_principles"
else
  printf '\033[32mok\033[0m   content present: %s SKILL.md, %s principle-*\n' "$n_skills" "$n_principles"
fi

for entry in "${PATTERNS[@]}"; do
  pat="${entry%%	*}"; desc="${entry#*	}"
  hits=$(git grep -nIE "$pat" -- . "${EXCLUDE[@]}" 2>/dev/null)
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

echo
if [ "$fail" -eq 0 ]; then
  echo "grep gate: clean"
else
  echo "grep gate: FAILED"
fi
exit "$fail"
