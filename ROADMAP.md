# SafeWriter — Roadmap con Interdependencias

## ⚡ Metodología de desarrollo (OBLIGATORIA)

### TDD obligatorio

Cada función del core sigue **Test-Driven Development**:

```
🔴 RED    → Escribir el test que falla primero
🟢 GREEN  → Código mínimo indispensable para que pase
🔁 REFACTOR → Limpiar manteniendo todos los tests verdes
```

**Regla de hierro:** si no viste el test fallar, no sabes si testea lo correcto.

### Mutation testing (Ralph Loop)

Cada módulo del core pasa por el ciclo **Ralph** con StrykerJS hasta alcanzar el score:

```
StrykerJS → survivors → más tests → StrykerJS → ... → score ≥ 80%
```

| Score | Significado |
|:-----:|-------------|
| < 60% | Tests débiles — reescribir aserciones |
| 60-80% | Aceptable pero seguir apretando |
| 80-90% | Bueno — revisar survivors por equivalentes |
| > 90% | Excelente |

---

## 📊 Mapa de interdependencias

```
Fase 1 ─ Safe File Save ──────────────────────────────────────────
    ↓ depende
Fase 2 ─ Anti-Delete (necesita Fase 1 para existir)
    ↓ depende
Fase 3 ─ Historial UI (necesita Fase 1 + Fase 2)
    ↓ depende
Fase 4 ─ Sincronización upstream (paralela a Fase 5)
    ↓
Fase 5 ─ Polish (todo lo anterior debe estar estable)
```

| Fase | Nombre | Depende de | Paralelizable con |
|------|--------|-----------|-------------------|
| 1 | Safe File Save | — | — |
| 2 | Anti-Delete | Fase 1 | — |
| 3 | Historial UI | Fase 1, Fase 2 | — |
| 4 | Sync upstream | — | Fase 5 |
| 5 | Polish | Fase 1, 2, 3 | Fase 4 |

---

## 🟢 Fase 1 — Safe File Save (Snapshot Inline)

**Objetivo:** Al guardar un archivo, en vez de sobrescribir, appendear una snapshot completa con timestamp.

**Dependencias:** Ninguna. Es la base de todo el proyecto.

### Componentes

| Componente | Archivo | Depende de |
|------------|---------|-----------|
| Formato .sw | `src/vs/workbench/services/safewriter/fileFormat.ts` | — |
| SafeWriterService | `src/vs/workbench/services/safewriter/safeWriterService.ts` | fileFormat.ts |
| Hook en save pipeline | `src/vs/workbench/services/textfile/common/textFileService.ts` | SafeWriterService |
| Hook en save (browser) | `src/vs/workbench/services/textfile/browser/browserTextFileService.ts` | SafeWriterService |
| Hook en save (electron) | `src/vs/workbench/services/textfile/electron-browser/electronTextFileService.ts` | SafeWriterService |
| File read interceptor | `src/vs/platform/files/common/fileService.ts` | fileFormat.ts |
| Extensión .sw | `extensions/markdown-basics/package.json` | — |
| Extensión .sw preview | `extensions/markdown-language-features/package.json` | — |

### Tasks

- [ ] TDD: `fileFormat.ts` — appendSnapshot()
- [ ] TDD: `fileFormat.ts` — readHistory()
- [ ] TDD: `fileFormat.ts` — restoreSnapshot()
- [ ] Ralph Loop: `fileFormat.ts` → score ≥ 80%
- [ ] TDD: `safeWriterService.ts` — appendSnapshot() con checksum SHA-256
- [ ] TDD: `safeWriterService.ts` — readHistory()
- [ ] TDD: `safeWriterService.ts` — restoreSnapshot()
- [ ] Ralph Loop: `safeWriterService.ts` → score ≥ 80%
- [ ] Hook en `textFileService.ts` — interceptar save() y saveAs()
- [ ] Hook en `browserTextFileService.ts`
- [ ] Hook en `electronTextFileService.ts`
- [ ] Interceptor en `fileService.ts` — separar contenido visible de historial al leer .sw
- [ ] Registrar `.sw` en extensiones Markdown

---

## 🟡 Fase 2 — Anti-Delete (Protección de archivos)

**Objetivo:** No se puede eliminar un archivo desde el explorador de SafeWriter. Solo papelera del SO.

**Dependencias:** Necesita Fase 1 (el pipeline de guardado debe existir para que el file locking tenga sentido).

### Componentes

| Componente | Archivo | Depende de |
|------------|---------|-----------|
| SafeFileLock | `src/vs/platform/files/common/safeFileLock.ts` | — |
| Quitar botón Delete | `src/vs/workbench/contrib/files/browser/fileActions.ts` | — |
| Quitar menú contextual | `src/vs/workbench/contrib/files/browser/explorerView.ts` | — |
| Desregistrar comandos | `src/vs/workbench/contrib/files/browser/fileCommands.ts` | — |
| Lock post-write | `src/vs/platform/files/node/diskFileService.ts` | safeFileLock.ts |
| Lock post-write (electron) | `src/vs/platform/files/electron-main/diskFileService.ts` | safeFileLock.ts |
| Interceptor write() | `src/vs/platform/files/common/io.ts` | safeFileLock.ts |

### Tasks

- [ ] TDD: `safeFileLock.ts` — lock(), unlock(), isLocked()
- [ ] Ralph Loop: `safeFileLock.ts` → score ≥ 80%
- [ ] Integrar lock en diskFileService (write → lock post-write)
- [ ] Quitar/deshabilitar `deleteFileHandler` en fileActions.ts
- [ ] Quitar "Eliminar" del menú contextual en explorerView.ts
- [ ] Desregistrar `deleteFile`, `moveFileToTrash` en fileCommands.ts
- [ ] Interceptar `write()` en io.ts para safeFileLock
- [ ] Tests de integración: crear archivo → escribir → verificar solo-lectura → safeFileLock.unlock → reescribir

---

## 🟠 Fase 3 — Historial UI (Panel de versiones)

**Objetivo:** Panel lateral con lista de snapshots. Restauración con 1 clic.

**Dependencias:** Fase 1 (necesita el formato de snapshot) + Fase 2 (protección contra borrado accidental).

### Componentes

| Componente | Archivo | Depende de |
|------------|---------|-----------|
| HistoryPanel | `src/vs/workbench/contrib/safewriter/browser/historyPanel.ts` | safeWriterService |
| Contribución panel | `src/vs/workbench/contrib/safewriter/browser/historyPanel.contribution.ts` | HistoryPanel |
| Estilos | `src/vs/workbench/contrib/safewriter/browser/media/historyPanel.css` | — |
| Comandos | `src/vs/workbench/contrib/safewriter/browser/safeWriterCommands.ts` | safeWriterService |
| AutoSaveConfig | `src/vs/workbench/contrib/safewriter/browser/autoSaveConfig.ts` | safeWriterService |
| AutoSaveScheduler | `src/vs/workbench/services/safewriter/autoSaveScheduler.ts` | safeWriterService |

### Tasks

- [ ] TDD: autoSaveScheduler.ts — timer-based + character-delta watcher
- [ ] Ralph Loop: autoSaveScheduler.ts → score ≥ 80%
- [ ] Implementar historyPanel.ts — lista de snapshots, botón restaurar
- [ ] Registrar panel en la workbench
- [ ] Implementar safeWriterCommands.ts — restoreSnapshot, viewHistory
- [ ] Implementar autoSaveConfig.ts — cada N chars, cada N min, off
- [ ] Tests de integración: guardar 3 veces → panel muestra 3 snapshots → restaurar la 1ª

---

## 🔵 Fase 4 — Sincronización upstream

**Objetivo:** Mantener el fork sincronizable con microsoft/vscode minimizando conflictos.

**Dependencias:** Ninguna de código. Puede correr en paralelo con Fase 5.

| Tarea | Descripción |
|-------|-------------|
| Ramas separadas | `safe-save`, `anti-delete`, `history-panel`, `main` |
| No tocar archivos ajenos | Los cambios se limitan a `src/vs/workbench/services/safewriter/` y `src/vs/workbench/contrib/safewriter/` |
| Merge periódico | `git merge upstream/main` en `main`, luego rebase de ramas feature |
| CI adaptado | Build solo los binarios necesarios, ignorar tests rotos de upstream |

---

## 🟣 Fase 5 — Polish

**Objetivo:** Experiencia de escritura pulida.

**Dependencias:** Fase 1, 2, 3 completas y estables.

| Feature | Archivo | Depende de |
|---------|---------|-----------|
| Modo zen forzado al abrir .sw | `src/vs/workbench/contrib/safewriter/browser/zenMode.ts` | Fase 1 |
| Estadísticas (pal/día, sesiones) | `src/vs/workbench/contrib/safewriter/browser/stats.ts` | safeWriterService |
| Exportar: aplanar archivo | Extensión de safeWriterService | Fase 1 |
| Comprimir snapshots viejos | safeWriterService + config | Fase 1 |
| Búsqueda en historial | historyPanel.ts | Fase 3 |

---

## 📁 Árbol completo del fork

```
src/vs/workbench/services/safewriter/
├── safeWriterService.ts       # Core: appendSnapshot, readHistory, restoreSnapshot
├── fileFormat.ts              # Parser/serializer del formato .sw
├── autoSaveScheduler.ts       # Timer + character-delta watcher
└── safeFileLock.ts            # Unlock → write → relock

src/vs/workbench/contrib/safewriter/
├── browser/
│   ├── historyPanel.ts                   # Panel lateral de snapshots
│   ├── historyPanel.contribution.ts      # Registro en la workbench
│   ├── safeWriterCommands.ts             # Comandos del fork
│   ├── autoSaveConfig.ts                 # UI de configuración
│   ├── zenMode.ts                        # Modo sin distracciones forzado
│   └── stats.ts                          # Estadísticas de escritura
│   └── media/
│       └── historyPanel.css
└── test/
    ├── fileFormat.test.ts
    ├── safeWriterService.test.ts
    ├── safeFileLock.test.ts
    ├── historyPanel.test.ts
    └── safeWriterCommands.test.ts
```
