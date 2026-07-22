# SafeWriter — Mapa de Dependencias, Bloqueos y Coordinación

> Análisis de interdependencias entre tareas internas de cada fase y entre fases, con puntos de coordinación y caminos críticos.

---

## 📊 Leyenda

| Símbolo | Significado |
|:-------:|-------------|
| ⛔ **BLOQUEA** | La tarea A no puede empezar hasta que B termine |
| ⚠️ **DEPENDE** | La tarea A necesita entrada/diseño de B, pero puede avanzar con un stub |
| 🔗 **COORDINA** | Dos tareas deben definirse juntas o compartir contrato |
| 🟢 **PARALELA** | Tareas que pueden hacerse simultáneamente sin dependencia |
| 🧪 **TDD** | Esta tarea requiere su test primero |
| 🔄 **RALPH** | Esta tarea requiere ciclo de mutation testing |
| 📐 **INTERFAZ** | Punto donde se define un contrato que otras tareas consumen |

---

## 🗺️ Mapa Global de Dependencias entre Fases

```
Fase 1 ──────────────────────────────────────────┐
  │                                               │
  ├─ 1.1 fileFormat.ts ◀─────── (interfaz) ──┐   │
  │                               │           │   │
  ├─ 1.2 safeWriterService.ts ◀──┘           │   │
  │                               │           │   │
  ├─ 1.3 Save Hook (TextFile) ◀──┘           │   │
  │                               │           │   │
  ├─ 1.4 AutoSave Scheduler ◀────┘           │   │
  │                               │           │   │
  └─ 1.5 File Read Interceptor ◀─┘           │   │
                                              │   │
Fase 2                                        │   │
  │                                           │   │
  ├─ 2.1 safeFileLock.ts ◀────────────────┐   │   │
  │                               │       │   │   │
  ├─ 2.2 Remove Delete Button ◀──┘       │   │   │
  │                               │       │   │   │
  └─ 2.3 Read-Only Locking ◀─────┘ ⛔─────┘   │   │
                                               │   │
Fase 3                                         │   │
  │                                            │   │
  ├─ 3.1 History Panel ◀──────── ⛔────────────┘   │
  │                               │                │
  ├─ 3.2 Restore Commands ◀──────┘                │
  │                               │                │
  └─ 3.3 AutoSave Config UI ◀────┘                │
                                                   │
Fase 5                                             │
  ├─ Export (aplanar) ◀────────── ⛔───────────────┘
  ├─ Compress old snapshots ◀──── ⛔───────────────┘
  ├─ Search in history ◀───────── ⛔─── Fase 3 ────┘
  └─ Zen mode ◀────────────────── 🟢 (paralela)
```

---

## 🟢 Fase 1 — Safe File Save (Snapshot Inline)

### 🧱 Árbol de dependencias internas

```
                    ┌─────────────────────┐
                    │ 1.1 fileFormat.ts   │ ← 📐 INTERFAZ del formato .sw
                    │ (parser/serializer) │
                    └──────────┬──────────┘
                               │ define el contrato
                               ▼
              ┌────────────────────────────────┐
              │ 1.2 safeWriterService.ts       │
              │ appendSnapshot()               │
              │ readHistory()                  │
              │ restoreSnapshot()              │
              └──────┬────────────┬────────────┘
                     │            │
          ⛔ depende │            │ ⛔ depende
                     ▼            ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ 1.3 Save Hook        │  │ 1.4 AutoSave         │
    │ (TextFileService)    │  │ Scheduler            │
    │ Interceptar save()   │  │ Timer + char-delta   │
    │ y saveAs()           │  │ → appendSnapshot()   │
    └──────────┬───────────┘  └──────────────────────┘
               │ ⛔ depende
               ▼
    ┌──────────────────────┐
    │ 1.5 File Read        │
    │ Interceptor          │
    │ (fileService.ts)     │
    │ .sw → solo mostrar   │
    │ contenido ACTUAL     │
    └──────────────────────┘
```

### 🔍 Desglose por tarea

---

#### 1.1 — `fileFormat.ts` ⭐ PUNTO DE PARTIDA

| Ítem | Detalle |
|------|---------|
| 🧪 TDD | 🔴 Escribir test para `parse()` con archivo válido → 🟢 implementar → 🔁 refactor |
| 🧪 TDD | 🔴 Escribir test para `serialize(content, history[])` → 🟢 implementar → 🔁 refactor |
| 🧪 TDD | 🔴 Escribir test para parse con archivo sin historial (solo contenido) → 🟢 implementar |
| 🧪 TDD | 🔴 Escribir test para parse con archivo corrupto → 🟢 lanzar error controlado |
| 🧪 TDD | 🔴 Escribir test para `extractCurrentContent()` → 🟢 implementar |
| 🔄 RALPH | StrykerJS sobre fileFormat.ts → score ≥ 80% |
| 📐 INTERFAZ | Define el contrato que consume safeWriterService y file read interceptor |

**Formato del contrato:**
```typescript
interface SafeWriterFile {
  currentContent: string;
  history: Snapshot[];
}

interface Snapshot {
  timestamp: string;   // ISO 8601
  type: 'manual' | 'auto' | 'restore';
  delta: number;       // caracteres respecto al snapshot anterior
  content: string;     // snapshot completo
  checksum?: string;   // SHA-256 (Fase 5)
}
```

**Dependencias externas:** ninguna. Es puro parseo de strings.
**🧵 Paralela con:** nada (es la base de todo).

---

#### 1.2 — `safeWriterService.ts` ⭐ CORE

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 1.1 fileFormat.ts |
| 🧪 TDD | 🔴 Test: `appendSnapshot(archivo, contenido)` añade bloque al final → 🟢 implementar |
| 🧪 TDD | 🔴 Test: `readHistory(archivo)` devuelve array de snapshots ordenado → 🟢 implementar |
| 🧪 TDD | 🔴 Test: `restoreSnapshot(archivo, index)` reemplaza currentContent → 🟢 implementar |
| 🧪 TDD | 🔴 Test: restoreSnapshot mantiene historial intacto (no destructivo) → 🟢 implementar |
| 🧪 TDD | 🔴 Test: appendSnapshot con archivo vacío → 🟢 crear primer snapshot |
| 🔄 RALPH | StrykerJS sobre safeWriterService.ts → score ≥ 80% |

**Dependencias externas:** necesita acceso al sistema de archivos (VS Code `IFileService`).
**🧵 Paralela con:** 1.5 (file read interceptor) — ambas consumen fileFormat, no se bloquean mutuamente.

---

#### 1.3 — Save Hook (TextFileService intercept)

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 1.2 safeWriterService.ts |
| 🧪 TDD | 🔴 Test: al hacer `save()` se llama a `appendSnapshot()` en vez de sobrescribir → 🟢 implementar |
| 🧪 TDD | 🔴 Test: `saveAs()` también usa snapshot → 🟢 implementar |
| 🧪 TDD | 🔴 Test: al abrir archivo .sw, el contenido visible es solo el actual → 🟢 (conecta con 1.5) |
| 🧪 INTEGRATION | Test end-to-end: abrir archivo → escribir → guardar → cerrar → abrir → verificar snapshot existe |
| 🔄 RALPH | StrykerJS sobre el hook → score ≥ 80% |

**Archivos a tocar:**
- `src/vs/workbench/services/textfile/common/textFileService.ts`
- `src/vs/workbench/services/textfile/browser/browserTextFileService.ts`
- `src/vs/workbench/services/textfile/electron-browser/electronTextFileService.ts`

**🔗 COORDINA CON:** 2.1 (safeFileLock) — el lock/unlock debe envolver el save. Definir interfaz `ILockableFile` ahora.

---

#### 1.4 — AutoSave Scheduler

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 1.2 safeWriterService.ts |
| 🟢 **PARCIALMENTE PARALELO CON** | 1.3 Save Hook (pueden diseñarse juntos) |
| 🧪 TDD | 🔴 Test: timer dispara appendSnapshot cada N minutos → 🟢 implementar |
| 🧪 TDD | 🔴 Test: watcher de caracteres dispara al superar umbral → 🟢 implementar |
| 🧪 TDD | 🔴 Test: no dispara si no hay cambios → 🟢 optimizar |
| 🧪 INTEGRATION | Escribir N caracteres, esperar, verificar snapshot creada |

**🔗 COORDINA CON:** 3.3 (AutoSave Config UI) — definir interfaz de configuración ahora:
```typescript
interface AutoSaveConfig {
  mode: 'disabled' | 'time' | 'chars' | 'both';
  intervalMinutes: number;   // para modo time
  charThreshold: number;     // para modo chars
}
```

---

#### 1.5 — File Read Interceptor

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 1.1 fileFormat.ts (necesita el parser) |
| 🟢 **PARALELO CON** | 1.2, 1.3, 1.4 |
| 🧪 TDD | 🔴 Test: al leer `.sw`, devuelve solo currentContent → 🟢 implementar |
| 🧪 TDD | 🔴 Test: lectura de archivo normal (`.md`, `.txt`) no se ve afectada → 🟢 implementar |
| 🧪 TDD | 🔴 Test: editor muestra el contenido correcto → 🟢 implementar |

**Archivos a tocar:** `src/vs/platform/files/common/fileService.ts`

---

### ⏱️ Orden de ejecución recomendado (Fase 1)

```
Semana 1   1.1 fileFormat.ts ──────── TDD + Ralph → 🎯 score ≥ 80%
                │
Semana 2   1.2 safeWriterService.ts ─ TDD + Ralph → 🎯 score ≥ 80%
                │
Semana 3   1.3 Save Hook ──────────── TDD + Integration → 🎯 E2E passing
                │
Semana 3   1.4 AutoSave ───────────── TDD (paralelo con 1.3 si recursos)
                │
Semana 4   1.5 Read Interceptor ───── TDD + Integration
```

---

## 🟡 Fase 2 — Anti-Delete (Protección de archivos)

### 🧱 Árbol de dependencias internas

```
  ┌──────────────────────────────┐
  │ 2.1 safeFileLock.ts          │ ← 📐 INTERFAZ con Fase 1
  │ unlock() → write() → lock()  │
  └──────┬───────────┬───────────┘
         │           │
         ▼           ▼
┌────────────────┐  ┌──────────────────────┐
│ 2.2 Remove     │  │ 2.3 Read-Only        │
│ Delete Button  │  │ Locking              │
│ (explorer UI)  │  │ post-write chmod      │
│                │  │ + wrapper en save     │
└────────────────┘  └──────────────────────┘
```

---

#### 2.1 — `safeFileLock.ts` ⭐ INTERFAZ CRÍTICA

| Ítem | Detalle |
|------|---------|
| 🟢 **NO REQUIERE** | Fase 1 completa — puede diseñarse en paralelo |
| 🔗 **COORDINA CON** | 1.3 Save Hook — deben acordar la interfaz `ILockableFile` |
| 🧪 TDD | 🔴 Test: `unlock(path)` permite escritura → 🟢 implementar |
| 🧪 TDD | 🔴 Test: `lock(path)` marca solo-lectura → 🟢 implementar |
| 🧪 TDD | 🔴 Test: `safewrite(path, content)` = unlock + write + lock atómico → 🟢 implementar |
| 🧪 TDD | 🔴 Test: si write falla, lock sigue aplicado → 🟢 implementar rollback |
| 🔄 RALPH | StrykerJS sobre safeFileLock.ts → score ≥ 80% |

**Interfaz:**
```typescript
interface ILockableFile {
  unlock(path: string): Promise<void>;
  lock(path: string): Promise<void>;
  safeWrite(path: string, content: string): Promise<void>;
  isLocked(path: string): Promise<boolean>;
}
```

---

#### 2.2 — Remove Delete Button

| Ítem | Detalle |
|------|---------|
| 🟢 **INDEPENDIENTE** | Solo toca UI del explorador |
| 🧪 TDD | 🔴 Test: menú contextual NO muestra "Eliminar" para archivos → 🟢 implementar |
| 🧪 TDD | 🔴 Test: tecla `Supr` no funciona en archivos → 🟢 desregistrar shortcut |
| 🧪 TDD | 🔴 Test: la papelera del sistema sigue funcionando → 🟢 mantener `moveToTrash` |

**Archivos a tocar:**
- `src/vs/workbench/contrib/files/browser/fileActions.ts`
- `src/vs/workbench/contrib/files/browser/explorerView.ts`
- `src/vs/workbench/contrib/files/browser/fileCommands.ts`

---

#### 2.3 — Read-Only Locking (post-write)

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 2.1 safeFileLock.ts (necesita el wrapper) |
| ⛔ **BLOQUEADO POR** | 1.3 Save Hook (debe integrarse en el pipeline de guardado) |
| 🧪 TDD | 🔴 Test: tras guardar, el archivo está en solo-lectura → 🟢 implementar |
| 🧪 TDD | 🔴 Test: SafeWriter puede seguir escribiendo (unlock+write+lock) → 🟢 implementar |
| 🧪 TDD | 🔴 Test: otro programa NO puede escribir → 🟢 verificar permisos |
| 🧪 INTEGRATION | E2E: abrir → escribir → guardar → verificar permisos → escribir otra vez |

**Archivos a tocar:**
- `src/vs/platform/files/common/io.ts`
- `src/vs/platform/files/node/diskFileService.ts`
- `src/vs/platform/files/electron-main/diskFileService.ts`

---

### ⏱️ Orden de ejecución recomendado (Fase 2)

```
Semana 1   2.1 safeFileLock.ts ──── TDD + Ralph (paralelo con Fase 1)
                │
Semana 1   2.2 Remove Delete ────── TDD (paralelo, independiente)
                │
Semana 2   2.3 Read-Only Lock ───── TDD + Integration ⛔ espera 1.3 + 2.1
```

---

## 🟠 Fase 3 — Historial UI (Panel de versiones)

### 🧱 Árbol de dependencias internas

```
  ┌──────────────────────────┐
  │ 1.2 safeWriterService.ts │ ← ⛔ BLOQUEADOR EXTERNO
  └────────────┬─────────────┘
               │ ⛔ necesita readHistory() y restoreSnapshot()
               ▼
  ┌──────────────────────────┐
  │ 3.1 History Panel        │
  │ Panel lateral con lista  │
  │ de snapshots             │
  └──────┬───────────────────┘
         │
         ▼
  ┌──────────────────────────┐    ┌──────────────────────────┐
  │ 3.2 Restore Commands     │    │ 3.3 AutoSave Config UI   │
  │ safewriter.restoreSnap() │    │ Interfaz de configuración│
  │ safewriter.viewHistory() │    │ modo/intervalo/umbral    │
  └──────────────────────────┘    └──────────────────────────┘
                                             │
                                    🔗 COORDINA CON 1.4
                                    (misma interfaz AutoSaveConfig)
```

---

#### 3.1 — History Panel

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 1.2 safeWriterService.ts (necesita `readHistory()`) |
| 🧪 TDD | 🔴 Test: panel se renderiza con lista de snapshots → 🟢 implementar |
| 🧪 TDD | 🔴 Test: cada entrada muestra timestamp + tipo + delta → 🟢 implementar |
| 🧪 TDD | 🔴 Test: al hacer clic en "Restaurar", se llama a `restoreSnapshot()` → 🟢 implementar |
| 🧪 TDD | 🔴 Test: el contenido del editor se actualiza tras restaurar → 🟢 implementar |
| 🧪 INTEGRATION | E2E: abrir archivo → ver historial → restaurar snapshot → contenido actualizado |
| 🟢 **PARALELO CON** | 3.2 (pueden desarrollarse juntos) |

---

#### 3.2 — Restore Commands

| Ítem | Detalle |
|------|---------|
| ⛔ **BLOQUEADO POR** | 3.1 (o puede hacerse en paralelo con la interfaz acordada) |
| 🧪 TDD | 🔴 Test: comando `safewriter.restoreSnapshot(3)` restaura la snapshot índice 3 → 🟢 |
| 🧪 TDD | 🔴 Test: comando con índice inválido lanza error → 🟢 |
| 🧪 TDD | 🔴 Test: shortcut Ctrl+Shift+H abre el panel → 🟢 |
| 🔄 RALPH | StrykerJS sobre safeWriterCommands.ts → score ≥ 80% |

---

#### 3.3 — AutoSave Config UI

| Ítem | Detalle |
|------|---------|
| 🟢 **PARALELO** | Puede diseñarse con 1.4, implementarse después |
| 🔗 **COORDINA CON** | 1.4 AutoSave Scheduler (misma interfaz `AutoSaveConfig`) |
| 🧪 TDD | 🔴 Test: UI muestra configuración actual → 🟢 |
| 🧪 TDD | 🔴 Test: cambiar modo "cada 500 chars" persiste → 🟢 |
| 🧪 TDD | 🔴 Test: cambiar modo "cada 5 min" persiste → 🟢 |
| 🧪 INTEGRATION | Cambiar config → esperar → verificar snapshot automática |

---

## 🔵 Fase 4 — Sincronización con upstream

| Ítem | Detalle |
|------|---------|
| 🟢 **CONTINUA** | No bloquea ni es bloqueada por otras fases |
| ⛔ **BLOQUEA** | Nada — la sincronización es preventiva |
| **Estrategia** | Rama `safe-save` con los cambios del core; merge semanal de `upstream/main` |

---

## 🟣 Fase 5 — Polish

### Dependencias

| Característica | ⛔ Bloqueada por | 🟢 Independiente de |
|---------------|:----------------:|:-------------------:|
| Export (aplanar) | 1.2 safeWriterService | Todo lo demás |
| Compress snapshots | 1.2 safeWriterService | Todo lo demás |
| Search in history | 3.1 History Panel | Todo lo demás |
| Checksums SHA-256 | 1.1 fileFormat.ts | Todo lo demás |
| Zen mode | Nada | ✅ Completamente independiente |
| Stats (pal/día) | 1.4 AutoSave Scheduler | Todo lo demás |

---

## 📐 Resumen de Interfaces (Contratos entre módulos)

| Interfaz | Definida en | Consumida por |
|----------|-------------|---------------|
| `SafeWriterFile`, `Snapshot` | 1.1 fileFormat.ts | 1.2, 1.5, 3.1 |
| `ILockableFile` | 2.1 safeFileLock.ts | 1.3 Save Hook, 2.3 |
| `AutoSaveConfig` | 1.4 AutoSave Scheduler | 3.3 AutoSave Config UI |
| `IHistoryEntry` | 1.2 safeWriterService.ts | 3.1 History Panel, 3.2 |

---

## 🧵 Caminos Paralelos (tareas que NO se bloquean)

| Grupo | Tareas | Pueden hacerse por |
|:-----:|--------|:------------------:|
| 🟢 A | 1.1 fileFormat.ts | 1 persona |
| 🟢 B | 2.1 safeFileLock.ts | Otra persona (paralelo con A) |
| 🟢 C | 2.2 Remove Delete Button | Otra persona (independiente) |
| 🟢 D | 1.4 AutoSave Scheduler + 3.3 Config UI | 1 persona (diseño conjunto) |
| 🟢 E | 3.1 History Panel + 3.2 Commands | 1 persona (después de 1.2) |
| 🟢 F | 5.5 Zen mode | Cualquiera, en cualquier momento |

---

## ⚠️ Puntos de Riesgo (Critical Path)

```
CRITICAL PATH (el camino más largo = tiempo mínimo de desarrollo):

1.1 fileFormat.ts ──→ 1.2 safeWriterService.ts ──→ 1.3 Save Hook ──→ 2.3 Read-Only Lock
       │                       │                        │
       │                       └──→ 3.1 History Panel ──→ 3.2 Commands
       │                       │
       │                       └──→ 1.4 AutoSave ──→ 5.4 Stats
       │
       └──→ 1.5 Read Interceptor
```

**El cuello de botella está en 1.1 → 1.2 → 1.3.** Todo lo demás puede paralelizarse alrededor de ese eje.

---

## 🧮 Estimación mínima realista

| Fase | Depende de | Tiempo estimado |
|:----:|:----------:|:---------------:|
| 1.1 | — | 2-3 días (TDD + Ralph) |
| 1.2 | 1.1 | 2-3 días |
| 1.3 | 1.2 | 3-4 días (VS Code internals) |
| 1.4 | 1.2 | 2 días |
| 1.5 | 1.1 | 1-2 días |
| 2.1 | — | 2 días (paralelo) |
| 2.2 | — | 1 día (paralelo) |
| 2.3 | 2.1 + 1.3 | 2 días |
| 3.1 | 1.2 | 3-4 días |
| 3.2 | 3.1 | 1-2 días |
| 3.3 | 1.4 | 1-2 días |
| 5.x | Varias | 1-2 días cada una |

**Camino crítico mínimo:** 1.1 (3d) + 1.2 (3d) + 1.3 (4d) + 2.3 (2d) = **~12 días hábiles** (~2.5 semanas) para tener un MVP funcional con guardado seguro + anti-delete.

**Con paralelización (2 personas):** ~8 días hábiles (~1.5 semanas).
