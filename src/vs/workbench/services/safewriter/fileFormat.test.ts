/**
 * Tests for SafeWriter fileFormat.ts
 *
 * Run: node --experimental-strip-types --test src/vs/workbench/services/safewriter/fileFormat.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendSnapshot, parseSwFile, type SwDocument } from './fileFormat.ts';

void describe('fileFormat', () => {
  void describe('appendSnapshot', () => {
    void it('appends a snapshot with correct format (no history)', () => {
      const doc: SwDocument = { currentContent: 'Hello world', history: [] };
      const result = appendSnapshot(doc, 'manual');

      assert.ok(result.startsWith('=== CONTENIDO ACTUAL ==='));
      assert.ok(result.includes('Hello world'));
      assert.ok(result.includes('=== SAFEWRITER v1 ==='));
      assert.ok(result.includes('TIMESTAMP:'));
      assert.ok(result.includes('TIPO: manual'));
      assert.ok(result.includes('SHA256:'));
    });

    void it('includes existing history entries', () => {
      const doc: SwDocument = {
        currentContent: 'Version 3',
        history: [
          {
            timestamp: '2026-07-22T10:00:00.000Z',
            type: 'manual',
            delta: 5,
            sha256: 'abc123',
            content: 'Version 1',
          },
          {
            timestamp: '2026-07-22T11:00:00.000Z',
            type: 'auto',
            delta: 2,
            sha256: 'def456',
            content: 'Version 2',
          },
        ],
      };
      const result = appendSnapshot(doc, 'auto');

      assert.ok(result.includes('Version 1'));
      assert.ok(result.includes('Version 2'));
      assert.ok(result.includes('Version 3'));
      const shaMatch = result.match(/SHA256:\s*([a-f0-9]{64})/);
      assert.ok(shaMatch, 'Should have a SHA256 hex digest');
      assert.equal(shaMatch![1].length, 64);
    });

    void it('handles empty content', () => {
      const doc: SwDocument = { currentContent: '', history: [] };
      const result = appendSnapshot(doc, 'auto');

      assert.ok(result.includes('=== CONTENIDO ACTUAL ==='));
      const content = result.split('=== CONTENIDO ACTUAL ===')[1].split('=== SAFEWRITER v1 ===')[0].trim();
      assert.equal(content, '');
    });

    void it('calculates delta correctly', () => {
      const doc: SwDocument = {
        currentContent: 'ABCDE',
        history: [
          {
            timestamp: '2026-07-22T10:00:00.000Z',
            type: 'manual',
            delta: 2,
            sha256: 'abc',
            content: 'AB',
          },
        ],
      };
      const result = appendSnapshot(doc, 'manual');
      assert.ok(result.includes('DELTA: +3'));
    });
  });

  void describe('parseSwFile', () => {
    void it('parses a minimal .sw file', () => {
      const input = `=== CONTENIDO ACTUAL ===
Hello world

=== SAFEWRITER v1 ===
--- TIMESTAMP: 2026-07-22T10:00:00.000Z | TIPO: manual | DELTA: +11 | SHA256: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 ---
Hello world`;

      const doc = parseSwFile(input);
      assert.equal(doc.currentContent, 'Hello world');
      assert.equal(doc.history.length, 1);
      assert.equal(doc.history[0].type, 'manual');
      assert.equal(doc.history[0].delta, 11);
    });

    void it('round-trips: appendSnapshot → parseSwFile preserves history', () => {
      const original: SwDocument = {
        currentContent: 'Round trip test',
        history: [
          {
            timestamp: '2026-07-22T10:00:00.000Z',
            type: 'manual',
            delta: 5,
            sha256: 'abc123',
            content: 'Start',
          },
        ],
      };

      const serialized = appendSnapshot(original, 'manual');
      const parsed = parseSwFile(serialized);

      assert.equal(parsed.currentContent, original.currentContent);
      assert.ok(parsed.history.length >= 1);
    });

    void it('throws on invalid format', () => {
      assert.throws(() => parseSwFile('garbage content'), /Invalid/);
    });
  });
});
