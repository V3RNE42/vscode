/**
 * Tests for SafeWriter safeFileLock.ts
 *
 * Run: node --experimental-strip-types --test src/vs/workbench/services/safewriter/safeFileLock.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lock, unlock, isLocked } from './safeFileLock.ts';

void describe('safeFileLock', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'safefilelock-test-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('lock() makes file read-only', async () => {
    const filePath = join(tmpDir, 'lock-readonly.sw');
    writeFileSync(filePath, 'test content', 'utf-8');
    await lock(filePath);
    const stats = statSync(filePath);
    assert.equal((stats.mode & 0o200), 0, 'File should not have owner write permission after lock');
  });

  void it('unlock() restores write permissions', async () => {
    const filePath = join(tmpDir, 'unlock-writable.sw');
    writeFileSync(filePath, 'test content', 'utf-8');
    await lock(filePath);
    await unlock(filePath);
    const stats = statSync(filePath);
    assert.notEqual((stats.mode & 0o200), 0, 'File should have owner write permission after unlock');
  });

  void it('isLocked() returns true after lock, false after unlock', async () => {
    const filePath = join(tmpDir, 'islocked-cycle.sw');
    writeFileSync(filePath, 'test content', 'utf-8');
    await lock(filePath);
    assert.equal(isLocked(filePath), true);
    await unlock(filePath);
    assert.equal(isLocked(filePath), false);
  });

  void it('isLocked() returns false for non-existent file', () => {
    assert.equal(isLocked(join(tmpDir, 'does-not-exist.sw')), false);
  });

  void it('lock() does not throw on non-existent file', async () => {
    await assert.doesNotReject(async () => lock(join(tmpDir, 'noexist-lock.sw')));
  });

  void it('unlock() does not throw on non-existent file', async () => {
    await assert.doesNotReject(async () => unlock(join(tmpDir, 'noexist-unlock.sw')));
  });

  void it('unlock() does not throw on already unlocked file', async () => {
    const filePath = join(tmpDir, 'already-unlocked.sw');
    writeFileSync(filePath, 'test', 'utf-8');
    await assert.doesNotReject(async () => unlock(filePath));
    const stats = statSync(filePath);
    assert.notEqual((stats.mode & 0o200), 0, 'File should remain writable');
  });

  void it('lock() does not throw on already locked file', async () => {
    const filePath = join(tmpDir, 'already-locked.sw');
    writeFileSync(filePath, 'test', 'utf-8');
    await lock(filePath);
    await assert.doesNotReject(async () => lock(filePath));
    const stats = statSync(filePath);
    assert.equal((stats.mode & 0o200), 0, 'File should remain read-only');
  });

  void it('full cycle: write, lock, unlock, verify write works again', async () => {
    const filePath = join(tmpDir, 'full-cycle.sw');
    writeFileSync(filePath, 'initial content', 'utf-8');
    await lock(filePath);
    assert.equal(isLocked(filePath), true);
    await unlock(filePath);
    assert.equal(isLocked(filePath), false);
    writeFileSync(filePath, 'rewritten content', 'utf-8');
    assert.equal(readFileSync(filePath, 'utf-8'), 'rewritten content');
  });

  void it('multiple locks and unlocks work idempotently', async () => {
    const filePath = join(tmpDir, 'multi-lock.sw');
    writeFileSync(filePath, 'test', 'utf-8');
    await lock(filePath);
    await lock(filePath);
    assert.equal(isLocked(filePath), true);
    await unlock(filePath);
    await unlock(filePath);
    assert.equal(isLocked(filePath), false);
    writeFileSync(filePath, 'still works', 'utf-8');
    assert.equal(readFileSync(filePath, 'utf-8'), 'still works');
  });
});
