import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const hook = join(import.meta.dir, '..', '..', '..', 'hooks', 'require-agent-tier.mjs');
const temps = [];
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const project = (roles) => {
  const dir = mkdtempSync(join(tmpdir(), 'tier-hook-'));
  temps.push(dir);
  if (roles !== undefined) {
    mkdirSync(join(dir, '.claude', 'rules'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'rules', 'mstack-models.md'), roles);
  }
  return dir;
};

const run = (stdin, dir) => {
  const r = spawnSync('node', [hook], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { stdout: r.stdout, status: r.status };
};

const call = (tool_input, dir) =>
  run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Agent', cwd: dir, tool_input }), dir);

const REASON =
  'mstack:poteto-agent needs an explicit model and effort. Set both on the Agent call. Tier efforts: fable high, opus high, sonnet medium, haiku low. A role line @<effort> suffix in .claude/rules/mstack-models.md wins over the tier value.';
const DENY = JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: REASON },
});
const poteto = 'mstack:poteto-agent';

describe('decision table', () => {
  test('model and effort set allows', () => {
    expect(call({ subagent_type: poteto, model: 'sonnet', effort: 'medium' }, project())).toEqual({ stdout: '', status: 0 });
  });

  test('model set, effort missing denies', () => {
    expect(call({ subagent_type: poteto, model: 'sonnet' }, project())).toEqual({ stdout: DENY + '\n', status: 0 });
  });

  test('model missing, effort set allows', () => {
    expect(call({ subagent_type: poteto, effort: 'low' }, project())).toEqual({ stdout: '', status: 0 });
  });

  test('both missing and no role file denies', () => {
    expect(call({ subagent_type: poteto }, project())).toEqual({ stdout: DENY + '\n', status: 0 });
  });

  test('both missing with a bare inherit-parent line allows', () => {
    const dir = project('judgment and prose: inherit-parent\n');
    expect(call({ subagent_type: poteto }, dir)).toEqual({ stdout: '', status: 0 });
  });

  test('both missing with a bare auto line allows', () => {
    const dir = project('- feature, refactoring: auto\n');
    expect(call({ subagent_type: poteto }, dir)).toEqual({ stdout: '', status: 0 });
  });

  test('auto@low does not unlock a bare call', () => {
    const dir = project('feature, refactoring: auto@low\n');
    expect(call({ subagent_type: poteto }, dir)).toEqual({ stdout: DENY + '\n', status: 0 });
  });
});

describe('scope and failure modes', () => {
  test('a non-poteto subagent_type is always allowed', () => {
    expect(call({ subagent_type: 'Explore' }, project())).toEqual({ stdout: '', status: 0 });
    expect(call({ subagent_type: 'mstack:Comment Sicko', model: 'haiku' }, project())).toEqual({ stdout: '', status: 0 });
  });

  test('malformed stdin allows', () => {
    expect(run('{not json', project())).toEqual({ stdout: '', status: 0 });
  });

  test('empty stdin allows', () => {
    expect(run('', project())).toEqual({ stdout: '', status: 0 });
  });

  test('falls back to the input cwd when CLAUDE_PROJECT_DIR is unset', () => {
    const dir = project('hardest tasks: inherit-parent\n');
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const r = spawnSync('node', [hook], {
      input: JSON.stringify({ cwd: dir, tool_input: { subagent_type: poteto } }),
      encoding: 'utf8',
      env,
    });
    expect({ stdout: r.stdout, status: r.status }).toEqual({ stdout: '', status: 0 });
  });
});
