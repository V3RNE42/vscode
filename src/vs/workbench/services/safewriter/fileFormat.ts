/**
 * SafeWriter File Format — Parser/Serializer
 *
 * Format:
 *   === CONTENIDO ACTUAL ===
 *   <visible content>
 *
 *   === SAFEWRITER v1 ===
 *   --- TIMESTAMP: <ISO> | TIPO: auto|manual | DELTA: +N | SHA256: <hash> ---
 *   <full snapshot>
 */

import { createHash } from 'node:crypto';

export interface SnapshotEntry {
  timestamp: string;
  type: 'auto' | 'manual';
  delta: number;
  sha256: string;
  content: string;
}

export interface SwDocument {
  currentContent: string;
  history: SnapshotEntry[];
}

/**
 * Append a snapshot to a SafeWriter document.
 * Returns the full .sw file content as a string.
 */
export function appendSnapshot(
  document: SwDocument,
  type: 'auto' | 'manual' = 'manual'
): string {
  const timestamp = new Date().toISOString();
  const sha256 = createHash('sha256')
    .update(document.currentContent)
    .digest('hex');
  const lastContent =
    document.history.length > 0
      ? document.history[document.history.length - 1].content
      : '';
  const actualDelta = document.currentContent.length - lastContent.length;

  const snapshotLine = `--- TIMESTAMP: ${timestamp} | TIPO: ${type} | DELTA: ${actualDelta >= 0 ? '+' : ''}${actualDelta} | SHA256: ${sha256} ---`;
  const snapshotBlock = `${snapshotLine}\n${document.currentContent}`;

  // Build full history block
  const historyBlocks = document.history
    .map(
      (entry) =>
        `--- TIMESTAMP: ${entry.timestamp} | TIPO: ${entry.type} | DELTA: ${entry.delta >= 0 ? '+' : ''}${entry.delta} | SHA256: ${entry.sha256} ---\n${entry.content}`
    )
    .join('\n\n');

  const parts = [
    '=== CONTENIDO ACTUAL ===',
    document.currentContent,
    '',
    '=== SAFEWRITER v1 ===',
    historyBlocks ? historyBlocks + '\n\n' : '',
    snapshotBlock,
  ];

  return parts.filter((p) => p !== '').join('\n');
}

/**
 * Parse a .sw file content back into an SwDocument.
 */
export function parseSwFile(content: string): SwDocument {
  const lines = content.split('\n');

  const currentMarker = lines.indexOf('=== CONTENIDO ACTUAL ===');
  const historyMarker = lines.indexOf('=== SAFEWRITER v1 ===');

  if (currentMarker === -1 || historyMarker === -1) {
    throw new Error('Invalid .sw file format');
  }

  const currentContent = lines
    .slice(currentMarker + 1, historyMarker)
    .filter((l) => l.trim() !== '')
    .join('\n');

  const historyLines = lines.slice(historyMarker + 1).filter((l) => l.trim() !== '');
  const history: SnapshotEntry[] = [];

  let i = 0;
  while (i < historyLines.length) {
    const header = historyLines[i];
    if (!header.startsWith('--- TIMESTAMP:')) {
      i++;
      continue;
    }

    const tsMatch = header.match(/TIMESTAMP:\s*([^\|]+)/);
    const tipoMatch = header.match(/TIPO:\s*(\w+)/);
    const deltaMatch = header.match(/DELTA:\s*([+-]?\d+)/);
    const shaMatch = header.match(/SHA256:\s*(\w+)/);

    if (!tsMatch || !tipoMatch || !deltaMatch || !shaMatch) {
      i++;
      continue;
    }

    const contentLines: string[] = [];
    i++;
    while (
      i < historyLines.length &&
      !historyLines[i].startsWith('--- TIMESTAMP:')
    ) {
      contentLines.push(historyLines[i]);
      i++;
    }

    history.push({
      timestamp: tsMatch[1].trim(),
      type: tipoMatch[1] as 'auto' | 'manual',
      delta: parseInt(deltaMatch[1], 10),
      sha256: shaMatch[1].trim(),
      content: contentLines.join('\n'),
    });
  }

  return { currentContent, history };
}
