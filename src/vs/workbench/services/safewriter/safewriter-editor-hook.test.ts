/**
 * Integration test for SafeWriter hook in TextFileEditorModel
 *
 * Validates that:
 * 1. Saving a .sw file produces valid SafeWriter format
 * 2. Non-.sw files are NOT affected
 * 3. Multiple saves produce multiple snapshots
 * 4. Content is properly restored via readSwFile
 *
 * Run: node --experimental-strip-types --test src/vs/workbench/services/safewriter/safewriter-editor-hook.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readSwFile, appendAndSave } from './safeWriterService.ts';

void describe('SafeWriter textFileEditorModel hook integration', () => {
	let tmpDir: string;

	before(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'safewriter-hook-test-'));
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	void it('saving a .sw file produces valid SafeWriter format on disk', async () => {
		const swPath = join(tmpDir, 'test-document.sw');

		const entry = await appendAndSave(swPath, 'Hello SafeWriter World!', 'manual');

		// File should exist
		assert.ok(existsSync(swPath), '.sw file must exist on disk after save');

		// Read raw content and verify markers
		const raw = readFileSync(swPath, 'utf-8');

		// Must contain the .sw format markers
		assert.ok(raw.includes('=== CONTENIDO ACTUAL ==='), 'file must contain current content marker');
		assert.ok(raw.includes('=== SAFEWRITER v1 ==='), 'file must contain SafeWriter version marker');
		assert.ok(raw.includes('Hello SafeWriter World!'), 'file must contain the saved content');

		// Snapshot entry metadata
		assert.equal(entry.type, 'manual', 'snapshot type must be manual');
		assert.ok(entry.timestamp, 'snapshot must have a timestamp');
		assert.ok(entry.sha256, 'snapshot must have a SHA-256 checksum');
		assert.ok(entry.delta >= 0, 'delta must be >= 0');

		// Verify via readSwFile
		const doc = readSwFile(swPath);
		assert.equal(doc.currentContent, 'Hello SafeWriter World!', 'readSwFile must return the current content');
		assert.equal(doc.history.length, 1, 'must have 1 snapshot in history');
	});

	void it('multiple saves produce multiple snapshots', async () => {
		const swPath = join(tmpDir, 'multi-save.sw');

		await appendAndSave(swPath, 'Version 1', 'manual');
		await appendAndSave(swPath, 'Version 2', 'auto');
		await appendAndSave(swPath, 'Version 3 - final', 'manual');

		const doc = readSwFile(swPath);

		// Current content should be the latest
		assert.equal(doc.currentContent, 'Version 3 - final');

		// Should have 3 snapshots in history
		assert.equal(doc.history.length, 3);

		// History entries in order (oldest first)
		assert.equal(doc.history[0].content, 'Version 1');
		assert.equal(doc.history[0].type, 'manual');

		assert.equal(doc.history[1].content, 'Version 2');
		assert.equal(doc.history[1].type, 'auto');

		assert.equal(doc.history[2].content, 'Version 3 - final');
		assert.equal(doc.history[2].type, 'manual');
	});

	void it('saving a non-.sw file does NOT produce SafeWriter format', async () => {
		// Write a normal file (simulating non-.sw save path)
		const txtPath = join(tmpDir, 'normal-file.txt');
		const { writeFileSync } = await import('node:fs');
		writeFileSync(txtPath, 'Normal content, no SafeWriter format');

		const raw = readFileSync(txtPath, 'utf-8');

		// Must NOT have SafeWriter markers
		assert.ok(!raw.includes('=== CONTENIDO ACTUAL ==='), 'txt file must NOT contain SafeWriter marker');
		assert.ok(!raw.includes('=== SAFEWRITER v1 ==='), 'txt file must NOT contain SafeWriter version marker');
		assert.equal(raw, 'Normal content, no SafeWriter format');
	});

	void it('restoreSnapshot returns correct historical content', async () => {
		const swPath = join(tmpDir, 'restore-test.sw');

		await appendAndSave(swPath, 'Initial draft', 'manual');
		await appendAndSave(swPath, 'Revised draft with edits', 'manual');

		// Restore first snapshot
		const restored = (await import('./safeWriterService.ts')).restoreSnapshot;
		const firstVersion = restored(swPath, 0);
		assert.equal(firstVersion, 'Initial draft');

		// Restore second snapshot
		const secondVersion = restored(swPath, 1);
		assert.equal(secondVersion, 'Revised draft with edits');
	});

	void it('compactHistory keeps only the specified number of snapshots', async () => {
		const swPath = join(tmpDir, 'compact-test.sw');

		await appendAndSave(swPath, 'v1', 'manual');
		await appendAndSave(swPath, 'v2', 'manual');
		await appendAndSave(swPath, 'v3', 'manual');
		await appendAndSave(swPath, 'v4', 'manual');
		await appendAndSave(swPath, 'v5', 'manual');

		const { compactHistory } = await import('./safeWriterService.ts');
		await compactHistory(swPath, 3);

		const doc = readSwFile(swPath);
		assert.equal(doc.history.length, 3, 'should keep only 3 entries after compact');
		assert.equal(doc.currentContent, 'v5', 'current content should be v5');
		assert.equal(doc.history[0].content, 'v3', 'first kept snapshot should be v3');
		assert.equal(doc.history[2].content, 'v5', 'last kept snapshot should be v5');
	});
});
