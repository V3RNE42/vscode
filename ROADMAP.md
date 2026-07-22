# SafeWriter — Hoja de Ruta (basada en código real)

> Roadmap con los archivos exactos del fork que hay que tocar para convertir VS Code en SafeWriter.

---

## 🟢 Fase 1 — Safe File Save (Snapshot Inline)

**Objetivo:** Al guardar un archivo de texto, en vez de sobrescribir, appendear una snapshot con timestamp.

### 1.1 Hook en el Save pipeline

VS Code orquesta el guardado a través de TextFileService. Los archivos clave:

| Archivo | Qué hace | Qué cambiar |
|---------|----------|-------------|
| `src/vs/workbench/services/textfile/common/textFileService.ts` | Servicio principal de guardado de archivos de texto | Interceptar `save()` y `saveAs()` para que en vez de sobrescribir, llamen a nuestro pipeline de snapshot |
| `src/vs/workbench/services/textfile/browser/browserTextFileService.ts` | Implementación browser del servicio | Override del método de escritura |
| `src/vs/workbench/services/textfile/electron-browser/electronTextFileService.ts` | Implementación Electron | Override del método de escritura |

**Tasks:**
- [ ] Identificar el punto exacto donde `ITextFileService.save()` escribe al disco
- [ ] Crear `src/vs/workbench/services/safewriter/safeWriterService.ts` — el core del formato `.sw`
- [ ] Implementar `appendSnapshot()`: lee el contenido actual, genera un bloque con timestamp + contenido, lo appendea al archivo
- [ ] Implementar `readHistory()`: parsea el archivo y separa contenido actual del historial
- [ ] Implementar `restoreSnapshot(index)`: reemplaza el contenido actual con una snapshot del historial

### 1.2 Formato SafeWriter

| Archivo | Propósito |
|---------|-----------|
| `src/vs/workbench/services/safewriter/fileFormat.ts` | Parser y serializer del formato `.sw` |

Formato:
```
=== CONTENIDO ACTUAL ===
<texto del usuario>

=== SAFEWRITER v1 ===
--- TIMESTAMP: 2026-07-22T10:30:00Z | TIPO: auto | DELTA: +350 ---
<snapshot>

--- TIMESTAMP: 2026-07-22T10:15:00Z | TIPO: manual | DELTA: 0 ---
<snapshot>
```

### 1.3 File Read interceptor

| Archivo | Qué cambiar |
|---------|-------------|
| `src/vs/platform/files/common/fileService.ts` | Al leer un archivo `.sw`, separar el contenido visible del historial. El editor solo ve el contenido ACTUAL. |

### 1.4 Extensión de formato `.sw`

| Archivo | Qué cambiar |
|---------|-------------|
| `extensions/markdown-basics/package.json` | Añadir `.sw` como extensión Markdown soportada |
| `extensions/markdown-language-features/package.json` | Añadir `.sw` al preview de Markdown |

---

## 🟡 Fase 2 — Anti-Delete (Protección de archivos)

**Objetivo:** No se puede eliminar un archivo desde el explorador de SafeWriter. Solo moviendo a la papelera del SO.

### 2.1 Eliminar el botón de Delete

| Archivo | Qué cambiar |
|---------|-------------|
| `src/vs/workbench/contrib/files/browser/fileActions.ts` | Aquí se registran las acciones del explorador de archivos. Eliminar/deshabilitar `deleteFileHandler`, `deleteFile` |
| `src/vs/workbench/contrib/files/browser/explorerView.ts` | El tree view del explorador. Eliminar entrada de menú contextual "Eliminar" para archivos |
| `src/vs/workbench/contrib/files/browser/fileCommands.ts` | Comandos globales. Desregistrar `deleteFile`, `moveFileToTrash` |

### 2.2 Read-Only file locking

| Archivo | Qué cambiar |
|---------|-------------|
| `src/vs/platform/files/common/io.ts` | Interceptar `write()` para marcar el archivo como solo-lectura tras escribir |
| `src/vs/platform/files/node/diskFileService.ts` | En Node/Electron: tras cada write, ejecutar `chmod 444` (Linux/macOS) o `SetFileAttributes(readonly)` (Windows) |
| `src/vs/platform/files/electron-main/diskFileService.ts` | Lo mismo para el proceso electron-main |

### 2.3 SafeWriter unlock/lock wrapper

| Archivo | Propósito |
|---------|-----------|
| `src/vs/platform/files/common/safeFileLock.ts` | Wrapper: desmarca solo-lectura → escribe → remarca solo-lectura. Solo SafeWriter puede hacer esto. |

---

## 🟠 Fase 3 — Historial UI (Panel de versiones)

**Objetivo:** Añadir un panel lateral donde se vean todas las snapshots con su timestamp, y se pueda restaurar cualquiera con un clic.

### 3.1 Nuevo panel

| Archivo | Propósito |
|---------|-----------|
| `src/vs/workbench/contrib/safewriter/browser/historyPanel.ts` | Panel lateral con la lista de snapshots |
| `src/vs/workbench/contrib/safewriter/browser/historyPanel.contribution.ts` | Registrar el panel en la workbench |
| `src/vs/workbench/contrib/safewriter/browser/media/historyPanel.css` | Estilos del panel |

### 3.2 Comandos

| Archivo | Propósito |
|---------|-----------|
| `src/vs/workbench/contrib/safewriter/browser/safeWriterCommands.ts` | Comandos: `safewriter.restoreSnapshot`, `safewriter.viewHistory` |

### 3.3 Auto-guardado configurable

| Archivo | Propósito |
|---------|-----------|
| `src/vs/workbench/contrib/safewriter/browser/autoSaveConfig.ts` | UI de configuración: auto-guardado cada N chars, cada N minutos, o desactivado |
| `src/vs/workbench/services/safewriter/autoSaveScheduler.ts` | Timer-based + character-delta watcher que dispara `appendSnapshot()` |

---

## 🔵 Fase 4 — Pull Requests y sincronización con upstream

**Objetivo:** Mantener el fork sincronizable con microsoft/vscode minimizando conflictos.

- [ ] Mantener los cambios en ramas separadas (`safe-save`, `anti-delete`, `history-panel`)
- [ ] No tocar archivos que no sean estrictamente necesarios
- [ ] Merge regular de `upstream/main` → `main`
- [ ] CI adaptado para construir solo los binarios necesarios

---

## 🟣 Fase 5 — Polish

| Feature | Archivos |
|---------|----------|
| Modo "sin distracciones" forzado al abrir `.sw` | `src/vs/workbench/contrib/safewriter/browser/zenMode.ts` |
| Estadísticas de escritura (pal/día, sesiones) | `src/vs/workbench/contrib/safewriter/browser/stats.ts` |
| Exportar: aplanar archivo (quitar historial) | Extensión del safeWriterService |
| Comprimir snapshots viejos | safeWriterService + config |
| Búsqueda en historial | historyPanel.ts |
| Integridad: checksums SHA-256 en cada snapshot | fileFormat.ts |

---

## 📁 Árbol completo de archivos nuevos del fork

```
src/vs/workbench/services/safewriter/
├── safeWriterService.ts      # Core: appendSnapshot, readHistory, restoreSnapshot
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
│   ├── stats.ts                          # Estadísticas de escritura
│   └── media/
│       └── historyPanel.css
└── test/
    ├── historyPanel.test.ts
    └── safeWriterCommands.test.ts
```
