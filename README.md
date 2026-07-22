# SafeWriter Editor — Fork de VS Code para Escritores

[![Forked from microsoft/vscode](https://img.shields.io/badge/fork-microsoft%2Fvscode-blue.svg)](https://github.com/microsoft/vscode)

**SafeWriter** es un fork de [Visual Studio Code (Code - OSS)](https://github.com/microsoft/vscode) diseñado específicamente para **escritores de libros** que necesitan protección absoluta contra pérdida de datos.

Cada archivo contiene TODO su historial de cambios con timestamps, incrustado dentro del propio archivo. No hay Git, no hay nube, no hay sorpresas.

> *"Mi padre borra todo de golpe y guarda accidentalmente. Quiero que eso nunca más sea un problema."*

---

## 🎯 ¿Qué cambia respecto a VS Code?

| Aspecto | VS Code original | SafeWriter |
|---------|:----------------:|:----------:|
| Guardar archivo | Sobrescribe | Appendea snapshot + timestamp al mismo archivo |
| Eliminar archivo | Botón en explorador | No existe — solo desde la papelera del sistema |
| Previsualización Markdown | ✅ | ✅ (igual) |
| Temas, atajos, editor | ✅ | ✅ (igual) |
| Historial de cambios | En carpeta `.git/` separada | **Dentro del archivo** — viaja con él |
| Destinatario | Programadores | Escritores no-técnicos |

El resto del editor (pestañas, explorador, Markdown preview, temas, extensiones, etc.) funciona exactamente igual.

---

## 🧠 Cómo funciona

SafeWriter cambia el formato de guardado. Un archivo `.sw` tiene esta pinta:

```
# Capítulo 1

Era una noche oscura... [contenido actual visible]

=== SAFEWRITER v1 ===
--- 2026-07-22 10:30 | auto | +350 chars ---
[texto completo del archivo en ese momento]

--- 2026-07-22 10:15 | manual | 0 chars ---
[texto completo del archivo en ese momento]
```

Cada vez que se guarda:
1. Se **appendea una snapshot completa** con timestamp al final del archivo
2. Si se borra todo y se guarda → la snapshot nueva está vacía, **las anteriores siguen ahí**
3. El archivo se marca **solo-lectura** en disco — solo SafeWriter puede modificarlo

---

## ⚙️ Cómo se desarrolla

### 🔴🟢🔁 TDD — Red-Green-Refactor (OBLIGATORIO)

Cada función del core se construye con Test-Driven Development:

```
🔴 RED    → Escribir el test que falla primero
🟢 GREEN  → Código mínimo para que pase
🔁 REFACTOR → Limpiar manteniendo tests verdes
```

### 🧪 Testing obligatorio

| Tipo | Cobertura mínima | Herramienta |
|------|:----------------:|-------------|
| Unit tests | Cada función pública | Mocha + Chai (VS Code stack) |
| Integration tests | Cada servicio completo | VS Code extension tests |
| Mutation tests | Core ≥ 80%, UI ≥ 60% | StrykerJS |

### 🔄 Ralph Loops

Cada módulo del core pasa por el ciclo de mutation testing hasta alcanzar el score:

```
StrykerJS → survivors → más tests → StrykerJS → ... → score ≥ 80%
```

Ver [ROADMAP.md](ROADMAP.md) para la hoja de ruta completa con archivos exactos.

---

## 🚀 Quick Start (próximamente)

```bash
git clone https://github.com/V3RNE42/vscode
cd vscode
yarn install
yarn compile
./scripts/code.sh
```

---

## 📄 Licencia

Microsoft [MIT](LICENSE.txt). Este proyecto mantiene la misma licencia que VS Code.
