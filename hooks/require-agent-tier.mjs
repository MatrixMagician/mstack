import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GUARDED = 'mstack:poteto-agent';
const REASON =
  'mstack:poteto-agent needs an explicit model and effort. Set both on the Agent call. Tier efforts: fable high, opus high, sonnet medium, haiku low. A role line @<effort> suffix in .claude/rules/mstack-models.md wins over the tier value.';
const BARE_ROLE_LINE = /^[\s>*-]*[^:\n]+:\s*`?(?:auto|inherit-parent)`?\s*$/m;

// Rows keyed by `${model set}${effort set}`; each yields true to allow.
const VERDICT = {
  '11': () => true,
  '10': () => false,
  '01': () => true,
  '00': (roles) => BARE_ROLE_LINE.test(roles),
};

const denial = (toolInput, roles) => {
  if (toolInput?.subagent_type !== GUARDED) return undefined;
  const key = `${toolInput.model ? 1 : 0}${toolInput.effort ? 1 : 0}`;
  return VERDICT[key](roles) ? undefined : REASON;
};

const readRoles = (input) => {
  for (const base of [process.env.CLAUDE_PROJECT_DIR, input.cwd]) {
    if (!base) continue;
    try {
      return readFileSync(join(base, '.claude', 'rules', 'mstack-models.md'), 'utf8');
    } catch {}
  }
  return '';
};

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const reason = denial(input.tool_input, readRoles(input));
  if (reason) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
      }),
    );
  }
} catch {}
