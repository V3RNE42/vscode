# SafeWriter — Copilot Instructions

## Project Overview

SafeWriter is a fork of VS Code (Code - OSS) that changes the save semantics for writers. Instead of overwriting files on save, it appends timestamped snapshots inside the file itself. Each `.sw` file carries its own complete history.

### Key architectural differences from VS Code

| Aspect | VS Code | SafeWriter |
|--------|---------|------------|
| Save | Overwrite | Append snapshot |
| File lock | None | chmod 444 after write |
| Delete from explorer | Yes | Removed |
| History | `.git/` folder | Inside the `.sw` file |
| File format | Any | `.sw` (SafeWriter) |

### New code structure

All SafeWriter code lives in two new directories. Everything else is vanilla VS Code.

```
src/vs/workbench/services/safewriter/
    safeWriterService.ts      # Core service
    fileFormat.ts             # .sw parser/serializer
    autoSaveScheduler.ts      # Timer-based auto-save
    safeFileLock.ts           # File lock/unlock wrapper

src/vs/workbench/contrib/safewriter/browser/
    historyPanel.ts           # Version history side panel
    historyPanel.contribution.ts
    safeWriterCommands.ts     # SafeWriter-specific commands
    autoSaveConfig.ts         # Auto-save configuration UI
    zenMode.ts                # Forced zen mode for .sw files
    stats.ts                  # Writing statistics
    media/historyPanel.css
```

### Modified upstream files

Minimal hooks — touch ONLY what's needed:

- `src/vs/workbench/services/textfile/common/textFileService.ts` — intercept save()
- `src/vs/workbench/services/textfile/browser/browserTextFileService.ts` — override write
- `src/vs/workbench/services/textfile/electron-browser/electronTextFileService.ts` — override write
- `src/vs/platform/files/common/fileService.ts` — intercept read() for .sw files
- `src/vs/platform/files/common/io.ts` — intercept write() for file locking
- `src/vs/platform/files/node/diskFileService.ts` — chmod after write
- `src/vs/platform/files/electron-main/diskFileService.ts` — same for electron-main
- `src/vs/workbench/contrib/files/browser/fileActions.ts` — remove delete
- `src/vs/workbench/contrib/files/browser/explorerView.ts` — remove context menu delete
- `src/vs/workbench/contrib/files/browser/fileCommands.ts` — unregister delete commands
- `extensions/markdown-basics/package.json` — register `.sw`
- `extensions/markdown-language-features/package.json` — register `.sw` preview

## File format (`.sw`)

```
=== CONTENIDO ACTUAL ===
<visible content>

=== SAFEWRITER v1 ===
--- TIMESTAMP: <ISO> | TIPO: auto|manual | DELTA: +N | SHA256: <hash> ---
<full snapshot>
```

- The editor ONLY sees `CONTENIDO ACTUAL`
- `SAFEWRITER v1` block stores all historical snapshots
- Each snapshot is a full copy (not a diff) for integrity
- Snapshots include SHA-256 checksum

## Coding guidelines

### TypeScript

Same as upstream VS Code:
- Tabs, not spaces
- PascalCase for types and enums
- camelCase for functions, methods, properties, variables
- Arrow functions over anonymous
- `async`/`await` over `.then()`
- Double quotes for user-facing strings (localized via `vs/nls`)
- Single quotes otherwise

### SafeWriter-specific

- NEVER modify upstream files beyond the minimum hook needed
- ALL new SafeWriter code goes under `src/vs/workbench/services/safewriter/` or `src/vs/workbench/contrib/safewriter/`
- Every public function in core modules must have unit tests
- Mutation testing score must be ≥ 80% for core, ≥ 60% for UI
- ALL user-facing strings must be in Spanish (the target user is Spanish-speaking)
- Register all IDisposables via DisposableStore or MutableDisposable

## Testing

### Compilation

```bash
# After changing src/ code
npm run typecheck-client

# After changing extensions/
npm run gulp compile-extensions
```

### Unit tests

```bash
scripts/test.sh --grep <pattern>
```

### Integration tests

```bash
scripts/test-integration.sh
```

### Layer validation

```bash
npm run valid-layers-check
```

### Mutation testing

```bash
npx stryker run
```

## Phases (see ROADMAP.md for full interdependencies)

1. **Safe File Save** — Implement `.sw` format, rewrite save pipeline, intercept read
2. **Anti-Delete** — Remove delete from explorer, add file locking
3. **History UI** — Side panel with snapshot list, one-click restore, auto-save config
4. **Upstream sync** — Branch strategy, periodic merge process
5. **Polish** — Zen mode, stats, snapshot compression, search in history

Each phase requires TDD + mutation testing before moving to the next.
