// Port-local rules live in files an upstream sync merges by hand. A rule dropped
// in that merge reads as a clean sync, so each one is pinned by the sentence
// that carries it, with the issue that earned it.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const skillsDir = join(import.meta.dir, '..', '..');

const rules = [
  { source: '#12 stop before you re-delegate', file: 'poteto-mode/SKILL.md', phrase: 'Stop the abandoned agent first, and confirm it stopped.' },
  { source: '#12 load the platform skill', file: 'poteto-mode/SKILL.md', phrase: "load that platform's skill" },
  { source: '#12 severity picks the artifact', file: 'poteto-mode/SKILL.md', phrase: 'severity decides its artifact, not where it turned up' },
  { source: '#12 delegate isolation', file: 'poteto-mode/playbooks/feature.md', phrase: 'Give every file-writing delegate its own worktree' },
  { source: '#12 drain the roster', file: 'poteto-mode/playbooks/opening-a-pr.md', phrase: 'stop every one that holds it, including grandchildren you never launched' },
  { source: '#12 verify the process', file: 'principle-prove-it-works/SKILL.md', phrase: 'Verify the process as well as the outcome.' },
  { source: '#12 red is a colour', file: 'principle-prove-it-works/SKILL.md', phrase: 'Red is a colour, not a measurement.' },
  { source: '#12 quote the failure content', file: 'tdd/SKILL.md', phrase: 'Quote the failure content' },
  { source: '#12 search the places the rules name', file: 'recall/SKILL.md', phrase: "A search that skips a place the project's rules name is not exhausted." },
  { source: '#12 blast-radius before design', file: 'blast-radius/SKILL.md', phrase: 'a brief that asserts something about existing code' },
];

describe('port-local skill rules', () => {
  test('every pinned phrase is distinctive enough to pin a rule', () => {
    const phrases = rules.map((r) => r.phrase);
    expect(new Set(phrases).size).toBe(phrases.length);
    for (const phrase of phrases) expect(phrase.length).toBeGreaterThanOrEqual(20);
  });

  for (const { source, file, phrase } of rules) {
    test(`${file} keeps the rule from ${source}`, () => {
      expect(readFileSync(join(skillsDir, file), 'utf8')).toContain(phrase);
    });
  }
});
