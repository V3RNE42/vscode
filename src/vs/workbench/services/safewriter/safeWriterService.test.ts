/**
 * Tests for SafeWriter safeWriterService.ts
 *
 * Run: node --experimental-strip-types --test src/vs/workbench/services/safewriter/safeWriterService.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readSwFile,
  appendAndSave,
  restoreSnapshot,
  compactHistory,
} from './safeWriterService.ts';
import { appendSnapshot, parseSwFile, type SwDocument } from './fileFormat.ts';

void describe('safeWriterService', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'safewriter-test-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  void describe('readSwFile', () => {
    void it('returns empty document for missing file', () => {
      const missingPath = join(tmpDir, 'nonexistent.sw');
      const doc = readSwFile(missingPath);
      assert.deepEqual(doc, { currentContent: '', history: [] });
    });

    void it('parses an existing .sw file correctly', () => {
      const filePath = join(tmpDir, 'existing.sw');
      const swContent = `=== CONTENIDO ACTUAL ===
Hello world

=== SAFEWRITER v1 ===
--- TIMESTAMP: 2026-07-22T10:00:00.000Z | TIPO: manual | DELTA: +11 | SHA256: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 ---
Hello world`;

      writeFileSync(filePath, swContent, 'utf-8');
      const doc = readSwFile(filePath);

      assert.equal(doc.currentContent, 'Hello world');
      assert.equal(doc.history.length, 1);
    });

    void it('throws on corrupted file', () => {
      const filePath = join(tmpDir, 'corrupted.sw');
      writeFileSync(filePath, 'garbage that is not valid sw format', 'utf-8');
      assert.throws(() => readSwFile(filePath), /Invalid/);
    });
  });

  void describe('appendAndSave', () => {
    void it('creates a file with snapshot and reads it back', async () => {
      const filePath = join(tmpDir, 'new.sw');
      const entry = await appendAndSave(filePath, 'Capítulo uno', 'manual');

      assert.ok(existsSync(filePath));
      assert.equal(entry.content, 'Capítulo uno');
      assert.equal(entry.type, 'manual');
      assert.equal(entry.sha256.length, 64);

      // Read it back
      const doc = readSwFile(filePath);
      assert.equal(doc.currentContent, 'Capítulo uno');
      assert.equal(doc.history.length, 1);
    });

    void it('appends multiple snapshots and history grows', async () => {
      const filePath = join(tmpDir, 'multi.sw');

      await appendAndSave(filePath, 'v1', 'manual');
      await appendAndSave(filePath, 'v2', 'auto');
      await appendAndSave(filePath, 'v3', 'manual');

      const doc = readSwFile(filePath);
      assert.equal(doc.currentContent, 'v3');
      assert.equal(doc.history.length, 3);
      assert.equal(doc.history[0].content, 'v1');
      assert.equal(doc.history[1].content, 'v2');
      assert.equal(doc.history[2].content, 'v3');
    });

    void it('creates nested directory automatically', async () => {
      const filePath = join(tmpDir, 'sub', 'dir', 'nested.sw');
      const entry = await appendAndSave(filePath, 'nested test', 'auto');

      assert.ok(existsSync(filePath));
      assert.equal(entry.content, 'nested test');
    });
  });

  void describe('restoreSnapshot', () => {
    void it('returns content for valid index', async () => {
      const filePath = join(tmpDir, 'restore.sw');
      await appendAndSave(filePath, 'first version', 'manual');
      await appendAndSave(filePath, 'second version', 'auto');

      const restored = restoreSnapshot(filePath, 0);
      assert.equal(restored, 'first version');
    });

    void it('returns last snapshot content', async () => {
      const filePath = join(tmpDir, 'restore2.sw');
      await appendAndSave(filePath, 'a', 'manual');
      await appendAndSave(filePath, 'b', 'manual');

      assert.equal(restoreSnapshot(filePath, 1), 'b');
    });

    void it('throws for negative index', () => {
      const filePath = join(tmpDir, 'empty-restore.sw');
      writeFileSync(filePath, `=== CONTENIDO ACTUAL ===

=== SAFEWRITER v1 ===
`, 'utf-8');
      assert.throws(() => restoreSnapshot(filePath, -1), /out of bounds/);
    });

    void it('throws for out-of-bounds index', async () => {
      const filePath = join(tmpDir, 'bounds.sw');
      await appendAndSave(filePath, 'only one', 'manual');

      assert.throws(() => restoreSnapshot(filePath, 5), /out of bounds/);
      assert.throws(() => restoreSnapshot(filePath, 1), /out of bounds/);
    });
  });

  void describe('compactHistory', () => {
    void it('keeps only the last N entries', async () => {
      const filePath = join(tmpDir, 'compact.sw');
      await appendAndSave(filePath, 'v1', 'manual');
      await appendAndSave(filePath, 'v2', 'auto');
      await appendAndSave(filePath, 'v3', 'manual');
      await appendAndSave(filePath, 'v4', 'auto');

      await compactHistory(filePath, 2);

      const doc = readSwFile(filePath);
      assert.equal(doc.history.length, 2);
      assert.equal(doc.history[0].content, 'v3');
      assert.equal(doc.history[1].content, 'v4');
    });

    void it('does nothing if history already within limit', async () => {
      const filePath = join(tmpDir, 'compact-within.sw');
      await appendAndSave(filePath, 'only one', 'manual');

      await compactHistory(filePath, 10);

      const doc = readSwFile(filePath);
      assert.equal(doc.history.length, 1);
    });

    void it('preserves current content after compaction', async () => {
      const filePath = join(tmpDir, 'compact-content.sw');
      await appendAndSave(filePath, 'content before', 'manual');
      await appendAndSave(filePath, 'current content', 'auto');

      await compactHistory(filePath, 1);

      const doc = readSwFile(filePath);
      assert.equal(doc.currentContent, 'current content');
    });
  });

  void describe('edge cases', () => {
    void it('round-trips very long content', async () => {
      const filePath = join(tmpDir, 'long.sw');
      const longContent = 'A'.repeat(100000);

      await appendAndSave(filePath, longContent, 'manual');
      const doc = readSwFile(filePath);

      assert.equal(doc.currentContent.length, 100000);
      assert.equal(doc.currentContent, longContent);
    });

    void it('handles file with no snapshots yet', () => {
      const filePath = join(tmpDir, 'fresh.sw');
      writeFileSync(filePath, `=== CONTENIDO ACTUAL ===
fresh

=== SAFEWRITER v1 ===
`, 'utf-8');

      const doc = readSwFile(filePath);
      assert.equal(doc.currentContent, 'fresh');
      assert.equal(doc.history.length, 0);
    });

    void it('creates 100 snapshots without error', async () => {
      const filePath = join(tmpDir, 'many.sw');
      for (let i = 0; i < 100; i++) {
        await appendAndSave(filePath, `snapshot-${i}`, i % 2 === 0 ? 'manual' : 'auto');
      }

      const doc = readSwFile(filePath);
      assert.equal(doc.history.length, 100);
      assert.equal(doc.currentContent, 'snapshot-99');
    });
  });
});
