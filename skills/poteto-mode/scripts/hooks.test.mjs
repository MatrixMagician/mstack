import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..', '..', '..');
const hooksPath = join(root, 'hooks', 'hooks.json');
const contextPath = join(root, 'hooks', 'session-start-context.md');
const frontmatter = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8').split('---')[1];

test('hooks.json registers one SessionStart command hook that cats the context file', () => {
  const hooks = JSON.parse(readFileSync(hooksPath, 'utf8')).hooks.SessionStart;
  assert.equal(hooks.length, 1);
  const [entry] = hooks;
  for (const event of ['startup', 'clear', 'compact']) {
    assert.match(event, new RegExp(`^(${entry.matcher})$`), `matcher misses ${event}`);
  }
  assert.equal(entry.hooks.length, 1);
  assert.equal(entry.hooks[0].type, 'command');
  assert.equal(entry.hooks[0].command, 'cat "${CLAUDE_PLUGIN_ROOT}/hooks/session-start-context.md"');
});

test('the context file exists and routes to the namespaced mode', () => {
  assert.ok(existsSync(contextPath));
  const context = readFileSync(contextPath, 'utf8');
  assert.match(context, /`mstack:poteto-mode`/);
  assert.ok(context.length < 2400, `context is ${context.length} chars, keep it near 300 tokens`);
});

test('every skill the context names is reachable through the Skill tool', () => {
  const context = readFileSync(contextPath, 'utf8');
  const named = [...context.matchAll(/`mstack:([a-z-]+)`/g)].map((m) => m[1]);
  assert.ok(named.length >= 6, `context names ${named.length} skills`);
  for (const skill of new Set(named)) {
    assert.doesNotMatch(frontmatter(skill), /disable-model-invocation: true/, `${skill} is user-invoked only`);
  }
});

test('principle leaves stay hidden from model invocation', () => {
  const leaves = readdirSync(join(root, 'skills')).filter((d) => d.startsWith('principle-'));
  assert.equal(leaves.length, 23);
  for (const leaf of leaves) assert.match(frontmatter(leaf), /disable-model-invocation: true/, leaf);
});

test('poteto-mode carries no sticky-mode frontmatter', () => {
  const fm = frontmatter('poteto-mode');
  for (const key of ['mode', 'icon', 'color', 'reminder']) {
    assert.doesNotMatch(fm, new RegExp(`^${key}:`, 'm'), `${key} is a sticky-mode key`);
  }
});
