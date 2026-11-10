import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const logScript = join(import.meta.dir, '..', '..', 'show-me-your-work', 'scripts', 'log.sh');

function appendRow(logfile) {
  const cwd = mkdtempSync(join(tmpdir(), 'log-sh-'));
  try {
    const run = spawnSync('/bin/bash', [logScript, logfile, 'plan', 'choice', 'why', 'evidence', 'result'], {
      cwd,
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    return readFileSync(join(cwd, logfile), 'utf8').split('\n');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

for (const logfile of ['decisions.tsv', '-decisions.tsv', '-logs/decisions.tsv']) {
  test(`log.sh writes the header and one row to ${logfile}`, () => {
    const [header, row, rest] = appendRow(logfile);
    assert.equal(header, 'ts\tphase\tdecision\twhy\tevidence\tresult');
    assert.match(row, /^\S+\tplan\tchoice\twhy\tevidence\tresult$/);
    assert.equal(rest, '');
  });
}
