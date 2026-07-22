/**
 * Integration tests for SafeWriter fileFormat.ts
 *
 * Tests with real file I/O — write .sw files to disk, read them back.
 *
 * Run: node --experimental-strip-types --test src/vs/workbench/services/safewriter/fileFormat.integration.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendSnapshot, parseSwFile, type SwDocument } from './fileFormat.ts';

let tmpDir: string;

void describe('fileFormat integration', () => {
  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'safewriter-int-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('writes a .sw file and reads it back', () => {
    const filePath = join(tmpDir, 'test.sw');

    const doc: SwDocument = { currentContent: 'Capítulo 1: El comienzo', history: [] };
    const content = appendSnapshot(doc, 'manual');
    writeFileSync(filePath, content, 'utf-8');

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseSwFile(raw);

    assert.equal(parsed.currentContent, 'Capítulo 1: El comienzo');
    assert.equal(parsed.history.length, 1);
    assert.equal(parsed.history[0].type, 'manual');
    assert.ok(parsed.history[0].sha256.length === 64);
  });

  void it('preserves multiple snapshots across writes', () => {
    const filePath = join(tmpDir, 'multi-test.sw');
    const doc1: SwDocument = { currentContent: 'Versión 1', history: [] };

    const content1 = appendSnapshot(doc1, 'manual');
    writeFileSync(filePath, content1, 'utf-8');

    const raw1 = readFileSync(filePath, 'utf-8');
    const parsed1 = parseSwFile(raw1);

    const doc2: SwDocument = {
      currentContent: 'Versión 2',
      history: parsed1.history,
    };
    const content2 = appendSnapshot(doc2, 'auto');
    writeFileSync(filePath, content2, 'utf-8');

    const raw2 = readFileSync(filePath, 'utf-8');
    const parsed2 = parseSwFile(raw2);

    assert.equal(parsed2.currentContent, 'Versión 2');
    assert.equal(parsed2.history.length, 2);
    assert.equal(parsed2.history[0].content, 'Versión 1');
    assert.equal(parsed2.history[1].content, 'Versión 2');
  });

  void it('handles empty file gracefully', () => {
    const filePath = join(tmpDir, 'empty.sw');
    const doc: SwDocument = { currentContent: '', history: [] };
    const content = appendSnapshot(doc, 'auto');
    writeFileSync(filePath, content, 'utf-8');

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseSwFile(raw);

    assert.equal(parsed.currentContent, '');
    assert.equal(parsed.history.length, 1);
    assert.equal(parsed.history[0].content, '');
  });

  void it('preserves content across write-read cycle', () => {
    const filePath = join(tmpDir, 'integrity.sw');
    const content = 'El quijote de la mancha...';

    const doc: SwDocument = { currentContent: content, history: [] };
    const serialized = appendSnapshot(doc, 'manual');
    writeFileSync(filePath, serialized, 'utf-8');

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseSwFile(raw);

    assert.equal(parsed.history[0].content, content);
  });
});
