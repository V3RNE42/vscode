---
name: safewriter-history-ui
description: "Build the history panel UI, commands, and auto-save config. Phase 3 of SafeWriter. Depends on Phases 1 and 2."
---

# SafeWriter — History UI

Build the side panel showing snapshot history with one-click restore.

## Prerequisites

Phase 1 (Save Pipeline) and Phase 2 (Anti-Delete) must be complete.

## Files to create

- `src/vs/workbench/contrib/safewriter/browser/historyPanel.ts`
- `src/vs/workbench/contrib/safewriter/browser/historyPanel.contribution.ts`
- `src/vs/workbench/contrib/safewriter/browser/safeWriterCommands.ts`
- `src/vs/workbench/contrib/safewriter/browser/autoSaveConfig.ts`
- `src/vs/workbench/contrib/safewriter/browser/media/historyPanel.css`
- `src/vs/workbench/services/safewriter/autoSaveScheduler.ts`

## Tasks (TDD each)

1. `autoSaveScheduler.ts`: timer + character-delta watcher
2. `historyPanel.ts`: snapshot list, restore button, search
3. `safeWriterCommands.ts`: restoreSnapshot, viewHistory
4. `autoSaveConfig.ts`: every N chars, every N min, off

## Exit criteria
- Panel visible in sidebar when .sw file is open
- Restore works: content reverts to selected snapshot
- Auto-save fires on timer and on character count threshold
