import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..', '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const POINTER = 'Set `effort` per **Effort by tier** in [`poteto-mode`](../poteto-mode/SKILL.md).';

const effortSection = () => {
  const mode = read('skills/poteto-mode/SKILL.md');
  const start = mode.indexOf('**Effort by tier.**');
  assert.ok(start >= 0, 'poteto-mode has no Effort by tier paragraph');
  return mode.slice(start, mode.indexOf('\n**', start + 1));
};

const roleLineReaders = () =>
  readdirSync(join(root, 'skills')).filter((skill) => {
    if (skill === 'poteto-mode') return false;
    try {
      return /line in `\.claude\/rules\/mstack-models\.md`/.test(read(`skills/${skill}/SKILL.md`));
    } catch {
      return false;
    }
  });

test('poteto-mode sets one default effort per tier', () => {
  const rows = [...effortSection().matchAll(/^\| `(\w+)` \| `(\w+)` \|$/gm)];
  assert.deepEqual(Object.fromEntries(rows.map(([, tier, effort]) => [tier, effort])), {
    fable: 'high',
    opus: 'high',
    sonnet: 'medium',
    haiku: 'low',
  });
});

test('the effort rule covers the suffix override and inherited models', () => {
  const section = effortSection();
  assert.match(section, /`@<effort>`/);
  assert.match(section, /`inherit-parent`/);
});

test('every skill that reads a role line points at the tier table', () => {
  const readers = roleLineReaders();
  assert.ok(readers.length >= 7, `found only ${readers.length} role-line readers: ${readers}`);
  for (const skill of readers) {
    assert.ok(read(`skills/${skill}/SKILL.md`).includes(POINTER), `${skill} lacks the effort pointer`);
  }
});

test('interrogate keeps no effort column of its own', () => {
  assert.doesNotMatch(read('skills/interrogate/SKILL.md'), /\|\s*Effort\s*\|/);
});

test('guide page 1 documents the effort suffix', () => {
  assert.match(read('docs/guide/01-setup.md'), /`@<effort>`/);
});
