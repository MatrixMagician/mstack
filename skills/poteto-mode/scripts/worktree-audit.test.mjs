import { afterEach, test } from 'bun:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { accessSync, chmodSync, constants, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const auditScript = join(import.meta.dir, 'worktree-audit.sh');
const fixtures = [];
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

const git = (...args) => execFileSync('/usr/bin/git', args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

function onPath(name) {
  for (const dir of (process.env.PATH ?? '').split(':')) {
    const candidate = join(dir, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  throw new Error(`${name} not found on PATH`);
}

// The script's external commands, minus the four the tests stub. The bin dir
// is the whole PATH, so a test can leave rg out and prove the warning path.
const externals = ['du', 'awk', 'date', 'stat', 'sort', 'grep', 'node'];

function createStubs(root, { rg = 'stub' } = {}) {
  const bin = join(root, 'bin');
  const realGit = `#!/bin/sh
if [ "$1" = -C ] && [ "$3" = status ] && [ -n "$AUDIT_FAIL_STATUS_PATH" ] && [ "$2" = "$AUDIT_FAIL_STATUS_PATH" ]; then
  exit 1
fi
if [ "$1" = fetch ]; then
  exit "\${AUDIT_FAIL_FETCH:-0}"
fi
exec /usr/bin/git "$@"
`;
  const gh = `#!/bin/sh
if [ "$AUDIT_FAIL_GH" = 1 ]; then exit 1; fi
printf '%s\\n' "$AUDIT_GH_RESPONSE"
`;
  const jq = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const branch = args[args.indexOf('--arg') + 2];
const records = JSON.parse(fs.readFileSync(0, 'utf8'));
const match = records.find((record) => record.headRefName === branch);
if (match) console.log([match.number, match.state, match.headRefOid ?? ''].join('\\t'));
`;
  const rgStub = `#!/bin/sh
if [ "$AUDIT_FAIL_RG" = 2 ]; then exit 2; fi
if [ -n "$AUDIT_RG_MATCH" ]; then
  printf '%s\\n' "$AUDIT_RG_MATCH"
  exit 0
fi
exit 1
`;
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'git'), realGit);
  writeFileSync(join(bin, 'gh'), gh);
  writeFileSync(join(bin, 'jq'), jq);
  for (const name of ['git', 'gh', 'jq']) chmodSync(join(bin, name), 0o755);
  if (rg === 'stub') {
    writeFileSync(join(bin, 'rg'), rgStub);
    chmodSync(join(bin, 'rg'), 0o755);
  } else if (rg === 'real') {
    symlinkSync(onPath('rg'), join(bin, 'rg'));
  }
  for (const name of externals) symlinkSync(onPath(name), join(bin, name));
  return bin;
}

function createRepo(options) {
  const root = mkdtempSync(join(tmpdir(), 'worktree-audit-test-'));
  fixtures.push(root);
  const repo = join(root, 'repo');
  const transcripts = join(root, 'transcripts');
  mkdirSync(transcripts);
  git('init', '--initial-branch=main', repo);
  git('-C', repo, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '--allow-empty', '-m', 'base');
  git('-C', repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  return { root, repo, transcripts, bin: createStubs(root, options) };
}

function addWorktree(fixture, name, branch) {
  const path = join(fixture.root, name);
  git('-C', fixture.repo, 'worktree', 'add', '-b', branch, path);
  return path;
}

function commit(worktree, message, filename = `${message.replaceAll(' ', '-')}.txt`) {
  writeFileSync(join(worktree, filename), `${message}\n`);
  git('-C', worktree, 'add', filename);
  git('-C', worktree, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-m', message);
}

function runAuditRaw(fixture, prs = [], extraEnv = {}) {
  return spawnSync('/bin/bash', [auditScript, fixture.repo, fixture.transcripts], {
    encoding: 'utf8',
    env: {
      HOME: fixture.root,
      PATH: fixture.bin,
      AUDIT_GH_RESPONSE: JSON.stringify(prs),
      AUDIT_RG_MATCH: '',
      AUDIT_FAIL_STATUS_PATH: '',
      AUDIT_FAIL_FETCH: '0',
      AUDIT_FAIL_GH: '0',
      AUDIT_FAIL_RG: '0',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runAudit(fixture, prs, extraEnv) {
  const result = runAuditRaw(fixture, prs, extraEnv);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function rows(output) {
  return output.trim().split('\n').slice(1).map((line) => line.split('\t'));
}

function rowFor(output, worktree) {
  const row = rows(output).find((fields) => fields.at(-1) === worktree);
  assert.ok(row, `missing row for ${worktree}\n${output}`);
  return row;
}

function pr(number, state, headRefName, headRefOid) {
  return { number, state, headRefName, headRefOid };
}

const today = () => new Date().toISOString().slice(0, 10);

test('preserves spaced worktree paths and rejects closed PRs as safe evidence', () => {
  const fixture = createRepo();
  const candidate = addWorktree(fixture, 'candidate', 'candidate');
  commit(candidate, 'candidate work');
  const spaced = addWorktree(fixture, 'candidate with spaces', 'spaced-candidate');
  const output = runAudit(fixture, [pr(99, 'CLOSED', 'candidate', git('-C', candidate, 'rev-parse', 'HEAD'))]);
  const candidateRow = rowFor(output, candidate);
  const spacedRow = rowFor(output, spaced);
  assert.equal(candidateRow[5], '#99/CLOSED');
  assert.equal(candidateRow[7], 'review');
  assert.equal(spacedRow[8], spaced);
  assert.notEqual(candidateRow[8], spacedRow[8]);
});

test('marks an actual origin/main ancestor safe', () => {
  const fixture = createRepo();
  const ancestor = addWorktree(fixture, 'ancestor', 'ancestor');
  commit(ancestor, 'merged into main');
  git('-C', fixture.repo, 'update-ref', 'refs/remotes/origin/main', git('-C', ancestor, 'rev-parse', 'HEAD'));
  const row = rowFor(runAudit(fixture), ancestor);
  assert.equal(row[2], 'YES');
  assert.equal(row[7], 'safe');
});

test('holds tracked dirty work', () => {
  const fixture = createRepo();
  const dirty = addWorktree(fixture, 'dirty', 'dirty');
  commit(dirty, 'tracked base', 'tracked.txt');
  writeFileSync(join(dirty, 'tracked.txt'), 'tracked change\n');
  const row = rowFor(runAudit(fixture), dirty);
  assert.match(row[3], /^wip:/);
  assert.equal(row[7], 'hold-wip');
});

test('holds an open PR', () => {
  const fixture = createRepo();
  const open = addWorktree(fixture, 'open', 'open');
  const head = git('-C', open, 'rev-parse', 'HEAD');
  const row = rowFor(runAudit(fixture, [pr(7, 'OPEN', 'open', head)]), open);
  assert.equal(row[5], '#7/OPEN');
  assert.equal(row[7], 'hold-open-pr');
});

test('accepts a merged PR whose head matches the worktree HEAD', () => {
  const fixture = createRepo();
  const merged = addWorktree(fixture, 'merged', 'merged');
  commit(merged, 'squash merged');
  const mergedHead = git('-C', merged, 'rev-parse', 'HEAD');
  const row = rowFor(runAudit(fixture, [pr(8, 'MERGED', 'merged', mergedHead)]), merged);
  assert.equal(row[5], '#8/MERGED');
  assert.equal(row[7], 'safe');
});

test('reviews commits added beyond a merged PR head', () => {
  const fixture = createRepo();
  const changed = addWorktree(fixture, 'changed', 'changed');
  commit(changed, 'merged commit');
  const mergedHead = git('-C', changed, 'rev-parse', 'HEAD');
  commit(changed, 'new commit');
  const row = rowFor(runAudit(fixture, [pr(9, 'MERGED', 'changed', mergedHead)]), changed);
  assert.equal(row[7], 'review');
});

test('reviews a worktree when its status probe fails', () => {
  const fixture = createRepo();
  const failed = addWorktree(fixture, 'failed-status', 'failed-status');
  const head = git('-C', failed, 'rev-parse', 'HEAD');
  const row = rowFor(
    runAudit(fixture, [pr(10, 'MERGED', 'failed-status', head)], { AUDIT_FAIL_STATUS_PATH: failed }),
    failed,
  );
  assert.equal(row[3], 'unknown');
  assert.equal(row[7], 'review');
});

for (const probe of ['AUDIT_FAIL_FETCH', 'AUDIT_FAIL_GH']) {
  test(`reviews an ancestor when discovery fails: ${probe}`, () => {
    const fixture = createRepo();
    const candidate = addWorktree(fixture, 'candidate', 'candidate');
    const row = rowFor(runAudit(fixture, [], { [probe]: '1' }), candidate);
    assert.equal(row[2], 'YES');
    assert.equal(row[7], 'review');
  });
}

test('reviews an ancestor when transcript search fails', () => {
  const fixture = createRepo();
  const candidate = addWorktree(fixture, 'candidate', 'candidate');
  const row = rowFor(runAudit(fixture, [], { AUDIT_FAIL_RG: '2' }), candidate);
  assert.equal(row[7], 'review');
});

test('keeps the recent-chat hold with an isolated transcript fixture', () => {
  const fixture = createRepo();
  const candidate = addWorktree(fixture, 'candidate', 'candidate');
  const transcript = join(fixture.transcripts, 'fixture.jsonl');
  writeFileSync(transcript, '{}\n');
  const row = rowFor(runAudit(fixture, [], { AUDIT_RG_MATCH: transcript }), candidate);
  assert.equal(row[7], 'verify-recent-chat');
});

test('finds a session that ran inside the worktree, under its own projects directory', () => {
  const fixture = createRepo({ rg: 'real' });
  const candidate = addWorktree(fixture, 'candidate', 'candidate');
  const encoded = candidate.replaceAll('/', '-');
  mkdirSync(join(fixture.transcripts, encoded));
  writeFileSync(join(fixture.transcripts, encoded, 'session.jsonl'), `{"cwd":"${candidate}"}\n`);
  const row = rowFor(runAudit(fixture), candidate);
  assert.equal(row[6], today());
  assert.equal(row[7], 'verify-recent-chat');
});

test('warns on stderr when rg is missing and still prints the table', () => {
  const fixture = createRepo({ rg: 'none' });
  const candidate = addWorktree(fixture, 'candidate', 'candidate');
  const result = runAuditRaw(fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /rg not found/);
  assert.match(result.stderr, /LAST_CHAT/);
  const row = rowFor(result.stdout, candidate);
  assert.equal(row[6], '-');
  assert.equal(row[7], 'review');
});
