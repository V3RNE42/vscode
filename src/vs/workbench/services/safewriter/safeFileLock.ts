/**
 * SafeWriter File Lock — OS-level file locking via chmod
 *
 * Provides lock/unlock/isLocked primitives for .sw files to prevent
 * accidental deletion (Anti-Delete). Works by toggling the write bit.
 *
 * Interface:
 *   lock(filePath)   – set read-only (chmod 444 on Unix)
 *   unlock(filePath) – set read-write (chmod 644 on Unix)
 *   isLocked(filePath) – boolean check via stat
 *
 * Graceful on missing files (silent no-op for lock/unlock, false for isLocked).
 * Graceful on redundant operations (idempotent).
 */
import { constants, promises as fs, existsSync, statSync } from 'node:fs';

const MODE_READONLY = 0o444;
const MODE_READWRITE = 0o644;

/**
 * Lock a file by setting it to read-only.
 * Does NOT throw if the file doesn't exist or is already locked.
 */
export async function lock(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }
  try {
    await fs.chmod(filePath, MODE_READONLY);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}

/**
 * Unlock a file by setting it to read-write.
 * Does NOT throw if the file doesn't exist or is already unlocked.
 */
export async function unlock(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }
  try {
    await fs.chmod(filePath, MODE_READWRITE);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}

/**
 * Check whether a file is locked (read-only).
 * Returns false if the file doesn't exist.
 */
export function isLocked(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }
  try {
    const stats = statSync(filePath);
    return (stats.mode & constants.S_IWUSR) === 0;
  } catch {
    return false;
  }
}
