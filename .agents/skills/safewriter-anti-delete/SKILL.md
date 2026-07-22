---
name: safewriter-anti-delete
description: "Remove delete from explorer, add file locking. Phase 2 of SafeWriter. Depends on Phase 1 (save pipeline)."
---

# SafeWriter — Anti-Delete

Remove the ability to delete files from the editor and add OS-level file locking.

## Prerequisites

Phase 1 (Save Pipeline) must be complete — the file lock wraps around the save pipeline.

## Files to modify

- `src/vs/workbench/contrib/files/browser/fileActions.ts` — remove deleteFileHandler
- `src/vs/workbench/contrib/files/browser/explorerView.ts` — remove "Eliminar" context menu
- `src/vs/workbench/contrib/files/browser/fileCommands.ts` — unregister deleteFile, moveFileToTrash

### New files
- `src/vs/platform/files/common/safeFileLock.ts`

### Modified upstream
- `src/vs/platform/files/common/io.ts` — intercept write()
- `src/vs/platform/files/node/diskFileService.ts` — chmod 444 after write
- `src/vs/platform/files/electron-main/diskFileService.ts` — same

## Tasks (TDD each)

1. `safeFileLock.ts`: lock(), unlock(), isLocked()
2. Hook diskFileService to call safeFileLock after write
3. Remove delete UI elements
4. Test: create → write → verify read-only → unlock → rewrite
