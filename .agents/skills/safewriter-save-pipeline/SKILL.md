---
name: safewriter-save-pipeline
description: "Implement the SafeWriter save pipeline: .sw file format, snapshot append, read interception. Phase 1 of SafeWriter."
---

# SafeWriter — Save Pipeline

Implement the core file format and save pipeline for SafeWriter.

## Files to create/modify

### New files
- `src/vs/workbench/services/safewriter/fileFormat.ts`
- `src/vs/workbench/services/safewriter/safeWriterService.ts`

### Modified upstream files
- `src/vs/workbench/services/textfile/common/textFileService.ts` — intercept save()
- `src/vs/workbench/services/textfile/browser/browserTextFileService.ts`
- `src/vs/workbench/services/textfile/electron-browser/electronTextFileService.ts`
- `src/vs/platform/files/common/fileService.ts` — intercept read() for .sw
- `extensions/markdown-basics/package.json`
- `extensions/markdown-language-features/package.json`

## Format

```
=== CONTENIDO ACTUAL ===
<text>

=== SAFEWRITER v1 ===
--- TIMESTAMP: <ISO> | TIPO: auto|manual | DELTA: +N | SHA256: <hash> ---
<full snapshot>
```

## Tasks (TDD each)

1. `fileFormat.ts`: appendSnapshot(), readHistory(), restoreSnapshot()
2. `safeWriterService.ts`: wrap fileFormat with file I/O
3. Hook textFileService save() to call safeWriterService
4. Hook fileService read() to strip history from visible content
5. Register `.sw` in markdown extensions

## Exit criteria
- All unit tests pass
- Mutation score ≥ 80% on fileFormat.ts and safeWriterService.ts
- Integration test: open .sw → edit → save → reopen → history intact
