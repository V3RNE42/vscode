# SafeWriter Editor

**SafeWriter** es un fork de [Visual Studio Code](https://github.com/microsoft/vscode) diseñado para **escritores de libros** que necesitan protección absoluta contra pérdida de datos.

## Intento original

> *"Mi padre borra todo de golpe y guarda accidentalmente. Quiero que eso nunca más sea un problema."*

Los escritores no usan Git. No hacen commit. No tienen staging area. Cuando escriben una novela, el archivo ES el libro. Si se borra el contenido y se guarda, se pierde todo.

SafeWriter resuelve esto cambiando la semántica de guardado: **cada vez que guardas, no sobrescribes — appendeas.**

## El principio fundamental

| Principio | Significado |
|-----------|-------------|
| **El archivo es el historial** | Cada archivo `.sw` contiene todas sus versiones anteriores dentro de sí mismo. No depende de Git, ni de la nube, ni de configuraciones externas. |
| **No se puede perder** | Aunque borres todo el contenido visible y guardes, las snapshots anteriores siguen intactas dentro del archivo. |
| **Portable** | Copias el archivo a un USB, lo abres en otro ordenador, y todo el historial viaja con él. |
| **No técnico** | El escritor no necesita saber qué es un "snapshot", "commit" o "branch". Simplemente escribe y guarda. |

## Especificaciones generales

### Formato de archivo

Los archivos `.sw` (SafeWriter) tienen esta estructura:

```
=== CONTENIDO ACTUAL ===
<texto visible del escritor>

=== SAFEWRITER v1 ===
--- TIMESTAMP: 2026-07-22T10:30:00Z | TIPO: auto | DELTA: +350 | SHA256: a1b2c3... ---
<snapshot completa del archivo en ese momento>

--- TIMESTAMP: 2026-07-22T10:15:00Z | TIPO: manual | DELTA: 0 | SHA256: d4e5f6... ---
<snapshot completa del archivo en ese momento>
```

- El editor solo muestra el bloque `CONTENIDO ACTUAL`
- El bloque `SAFEWRITER v1` contiene el historial completo
- Cada snapshot lleva su timestamp, tipo (auto/manual), delta de caracteres, y checksum SHA-256
- Las snapshots son **completas** (no diffs) para facilitar restauración e integridad

### Pipeline de guardado

```
Usuario guarda (Ctrl+S / auto-save)
       ↓
1. SafeWriterService.appendSnapshot()
       ↓
2. Leer archivo actual completo
3. Generar checksum SHA-256 del contenido actual
4. Formatear entrada de historial con timestamp + checksum
5. Appendear al final del archivo
6. SafeFileLock.unlock() → write() → SafeFileLock.relock()
       ↓
   Archivo marcado solo-lectura en disco (chmod 444 / FILE_ATTRIBUTE_READONLY)
```

### Pipeline de lectura

```
Usuario abre archivo .sw
       ↓
1. FileService.read() interceptado para .sw
2. Separar contenido visible (primer bloque) del historial
3. Devolver solo contenido visible al editor
4. Historial disponible en panel lateral
       ↓
   Editor ve solo el texto actual. El historial viaja oculto.
```

### Integridad

- Cada snapshot incluye SHA-256 del contenido en ese momento
- Al restaurar una snapshot, se verifica el checksum
- Si un archivo está dañado, el resto de snapshots siguen siendo recuperables
- Compresión opcional de snapshots viejos (configurable)

### Stack técnico

| Capa | Tecnología |
|------|-----------|
| Editor base | VS Code (Code - OSS) |
| Lenguaje | TypeScript |
| UI | Web + Electron |
| Tests unitarios | Mocha + Chai |
| Tests integración | VS Code extension test runner |
| Mutation testing | StrykerJS |

## Archivos clave del fork

Los cambios se limitan a estos archivos. El resto del código permanece idéntico a upstream.

```
src/vs/workbench/services/safewriter/
├── safeWriterService.ts       # Core: appendSnapshot, readHistory, restoreSnapshot
├── fileFormat.ts              # Parser/serializer del formato .sw
└── safeFileLock.ts            # Unlock → write → relock

src/vs/workbench/contrib/safewriter/
└── browser/
    ├── historyPanel.ts               # Panel lateral de snapshots
    ├── safeWriterCommands.ts         # Comandos del fork
    ├── autoSaveConfig.ts            # Config de auto-guardado
    ├── zenMode.ts                    # Modo sin distracciones forzado
    └── stats.ts                      # Estadísticas de escritura
```

Ver [ROADMAP.md](ROADMAP.md) para la secuencia de implementación con interdependencias.

## Licencia

[MIT](LICENSE.txt) — misma que VS Code.
