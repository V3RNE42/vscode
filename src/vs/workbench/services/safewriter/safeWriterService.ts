/**
 * SafeWriter Service — File I/O layer for .sw documents
 *
 * Wraps fileFormat.ts with real file system operations.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  appendSnapshot,
  parseSwFile,
  type SnapshotEntry,
  type SwDocument,
} from './fileFormat.ts';

function serializeSwFile(doc: SwDocument): string {
  const parts: string[] = [
    '=== CONTENIDO ACTUAL ===',
    doc.currentContent,
    '',
    '=== SAFEWRITER v1 ===',
  ];

  const historyBlocks = doc.history
    .map(
      (entry) =>
        `--- TIMESTAMP: ${entry.timestamp} | TIPO: ${entry.type} | DELTA: ${entry.delta >= 0 ? '+' : ''}${entry.delta} | SHA256: ${entry.sha256} ---\n${entry.content}`
    )
    .join('\n\n');

  if (historyBlocks) {
    parts.push(historyBlocks);
  }

  return parts.join('\n');
}

/**
 * Read a .sw file from disk and parse it into an SwDocument.
 * If the file does not exist, returns an empty document.
 */
export function readSwFile(filePath: string): SwDocument {
  if (!existsSync(filePath)) {
    return { currentContent: '', history: [] };
  }

  const content = readFileSync(filePath, 'utf-8');
  return parseSwFile(content);
}

/**
 * Append a snapshot to a .sw file and persist to disk.
 * Creates the file if it doesn't exist.
 * Returns the newly created SnapshotEntry.
 */
export async function appendAndSave(
  filePath: string,
  content: string,
  type: 'auto' | 'manual' = 'manual',
): Promise<SnapshotEntry> {
  const doc = readSwFile(filePath);
  doc.currentContent = content;

  const serialized = appendSnapshot(doc, type);

  // Ensure the target directory exists
  mkdirSync(dirname(filePath), { recursive: true });

  try {
    writeFileSync(filePath, serialized, 'utf-8');
  } catch (err: unknown) {
    const sysErr = err as NodeJS.ErrnoException;
    if (sysErr.code === 'ENOSPC') {
      throw new Error(
        `SafeWriter: Cannot write to "${filePath}" — disk is full (ENOSPC).`,
      );
    }
    if (sysErr.code === 'EACCES' || sysErr.code === 'EPERM') {
      throw new Error(
        `SafeWriter: Permission denied writing to "${filePath}" (${sysErr.code}).`,
      );
    }
    throw new Error(
      `SafeWriter: Failed to write "${filePath}": ${sysErr.message || String(err)}`,
    );
  }

  // Parse back to return the full SnapshotEntry
  const newDoc = parseSwFile(serialized);
  return newDoc.history[newDoc.history.length - 1];
}

/**
 * Restore the content of a snapshot at the given index.
 */
export function restoreSnapshot(
  filePath: string,
  snapshotIndex: number,
): string {
  const doc = readSwFile(filePath);

  if (snapshotIndex < 0 || snapshotIndex >= doc.history.length) {
    throw new Error(
      `Snapshot index ${snapshotIndex} is out of bounds. History has ${doc.history.length} entries.`,
    );
  }

  return doc.history[snapshotIndex].content;
}

/**
 * Compact the snapshot history, keeping only the last `keepLast` entries.
 */
export async function compactHistory(
  filePath: string,
  keepLast: number,
): Promise<void> {
  const doc = readSwFile(filePath);

  if (doc.history.length > keepLast) {
    doc.history = doc.history.slice(doc.history.length - keepLast);
  }

  const serialized = serializeSwFile(doc);

  try {
    writeFileSync(filePath, serialized, 'utf-8');
  } catch (err: unknown) {
    const sysErr = err as NodeJS.ErrnoException;
    if (sysErr.code === 'ENOSPC') {
      throw new Error(
        `SafeWriter: Cannot write to "${filePath}" — disk is full (ENOSPC).`,
      );
    }
    if (sysErr.code === 'EACCES' || sysErr.code === 'EPERM') {
      throw new Error(
        `SafeWriter: Permission denied writing to "${filePath}" (${sysErr.code}).`,
      );
    }
    throw new Error(
      `SafeWriter: Failed to write "${filePath}": ${sysErr.message || String(err)}`,
    );
  }
}
