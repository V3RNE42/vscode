# SafeWriter — AGENTS.md

Guía para coding agents que trabajan en el fork SafeWriter de VS Code.

## Stack

- **Lenguaje:** TypeScript
- **Tests unitarios:** Mocha + Chai (VS Code stack)
- **Tests integración:** VS Code extension test runner
- **Mutation testing:** StrykerJS
- **Compilación:** `npm run typecheck-client` (cambios en `src/`)
- **Validación capas:** `npm run valid-layers-check`

## Principios del fork

1. **No tocar upstream.** Todos los cambios van en:
   - `src/vs/workbench/services/safewriter/`
   - `src/vs/workbench/contrib/safewriter/`
   - Hooks mínimos en `textFileService.ts`, `fileService.ts`, `diskFileService.ts`
2. **TDD obligatorio.** Cada función pública se construye con Red-Green-Refactor.
3. **Mutation testing obligatorio.** Score ≥ 80% en core, ≥ 60% en UI.
4. **Archivos `.sw` son autocontenidos.** Todo el historial vive dentro del archivo.

## Pipelines de desarrollo

Para implementar cualquier cambio:

### Pipeline completa

```
TDD (Red → Green → Refactor)
    ↓
Integration testing (Wire → Assert → Verify)
    ↓
Mutation testing (Ralph Loop → score ≥ 80%)
```

### TDD cycle

```
1. Escribir test que falla → confirmar RED (pytest -x)
2. Escribir código mínimo → confirmar GREEN
3. Refactorizar → confirmar tests siguen verdes
```

### Ralph Loop (mutation testing)

```
StrykerJS → survivors → analizar → escribir tests → StrykerJS → ... → score ≥ 80%
```

Usar `--ramp` para escalar temperatura si el loop se estanca (0.3 → 0.5 → 0.7 → 1.0 → 1.2).

## Archivos a tocar por fase

| Fase | Archivos |
|------|----------|
| 1 — Safe File Save | `fileFormat.ts`, `safeWriterService.ts`, `textFileService.ts`, `fileService.ts`, extensiones markdown |
| 2 — Anti-Delete | `safeFileLock.ts`, `diskFileService.ts`, `fileActions.ts`, `explorerView.ts`, `fileCommands.ts` |
| 3 — Historial UI | `historyPanel.ts`, `safeWriterCommands.ts`, `autoSaveScheduler.ts`, `autoSaveConfig.ts` |
| 5 — Polish | `zenMode.ts`, `stats.ts` |

Ver [ROADMAP.md](ROADMAP.md) para interdependencias completas.
