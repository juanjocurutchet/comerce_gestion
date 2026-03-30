# Instructivo — Gestión Comercio SaaS

Guía completa desde la personalización por cliente hasta la entrega, activación y mantenimiento.

---

## Índice

1. [Setup inicial (una sola vez)](#1-setup-inicial)
2. [Preparar una versión para un nuevo cliente](#2-nuevo-cliente)
3. [Generar el instalador](#3-generar-el-instalador)
4. [Entregar la app al cliente](#4-entregar-al-cliente)
5. [Crear la licencia y generar la clave](#5-crear-la-licencia)
6. [El cliente activa la app](#6-activación-del-cliente)
7. [Mantenimiento mensual](#7-mantenimiento-mensual)
8. [Publicar una actualización de código](#8-publicar-actualización)
9. [Referencia rápida de archivos](#9-referencia-de-archivos)

---

## 1. Setup inicial

> Solo hacés esto una vez. Si ya está configurado, saltá al paso 2.

### Herramientas necesarias
- Node.js 20+
- Git
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Supabase](https://supabase.com)

### Tu instalación admin

Tu propia copia de la app es la que usás para administrar licencias. Debe tener:

**`resources/client.json`**
```json
{
  "clientId": "admin",
  "clientName": "Mi Comercio",
  "isAdmin": true,
  "features": {
    "ventas": true,
    "cotizaciones": true,
    "productos": true,
    "stock": true,
    "proveedores": true,
    "caja": true,
    "reportes": true,
    "usuarios": true,
    "backup": true,
    "configuracion": true
  }
}
```

**`resources/supabase.json`** (este archivo NO se sube a git)
```json
{
  "url": "https://ceuxvmdixwshssvqwhzm.supabase.co",
  "anonKey": "eyJ...",
  "serviceKey": "eyJ..."
}
```

> ⚠️ El `serviceKey` solo debe estar en TU instalación. Los clientes nunca tienen este archivo.

---

## 2. Nuevo cliente

### Crear la carpeta del cliente

En la raíz del proyecto existe una carpeta `clients/`. Creá una subcarpeta con el nombre del cliente:

```
clients/
  floreria-martinez/
    client.json
    logo.png        ← opcional
```

### Personalizar `client.json`

Copiá el template y editá según lo acordado con el cliente:

```json
{
  "clientId": "floreria-martinez",
  "clientName": "Florería Martínez",
  "isAdmin": false,
  "features": {
    "ventas": true,
    "cotizaciones": false,
    "productos": true,
    "stock": true,
    "proveedores": true,
    "caja": true,
    "reportes": true,
    "usuarios": true,
    "backup": true,
    "configuracion": true
  }
}
```

**Campos importantes:**
| Campo | Descripción |
|---|---|
| `clientId` | Identificador único, sin espacios ni tildes |
| `clientName` | Nombre que aparece en la app y en las facturas |
| `isAdmin` | Siempre `false` para clientes |
| `features.*` | `true` activa la sección, `false` la oculta |

### Agregar el logo (opcional)

Si el cliente quiere su logo en la app y en los comprobantes, copiá el archivo como `logo.png` dentro de su carpeta. Formatos soportados: PNG, JPG, SVG.

**Tamaño recomendado:** 300×100 px, fondo transparente (PNG).

---

## 3. Generar el instalador

### Paso a paso

```bash
# 1. Ir a la raíz del proyecto
cd /ruta/al/proyecto

# 2. Copiar los archivos del cliente a resources/
cp clients/floreria-martinez/client.json resources/client.json
cp clients/floreria-martinez/logo.png resources/logo.png   # si tiene logo

# 3. Generar el instalador para Windows
npm run dist:win
```

El instalador queda en:
```
dist/
  Gestión Comercio Setup 1.0.0.exe
```

### Limpiar después del build

Después de generar el instalador, restaurá `resources/client.json` a la versión admin para que tu instalación funcione correctamente:

```bash
cp resources/client.json.admin resources/client.json
```

> **Tip:** Guardá una copia de tu `client.json` admin como `resources/client.json.admin` para restaurar rápido.

### Renombrar el instalador

Renombrá el archivo antes de enviarlo para identificar a qué cliente pertenece:

```
Gestión Comercio Setup 1.0.0.exe
→ GestionComercio-FloreriaMartinez-v1.0.0.exe
```

---

## 4. Entregar la app al cliente

Opciones para enviar el instalador (~80-150 MB):

| Método | Cómo |
|---|---|
| **WeTransfer** | wetransfer.com — gratis, hasta 2 GB |
| **Google Drive** | Subís y compartís el link |
| **WhatsApp** | Solo si el archivo pesa menos de 100 MB |
| **USB / presencial** | Vas al local y lo instalás vos |

### Instrucciones para el cliente

Podés enviarle este mensaje junto con el instalador:

---
*"Te mando el instalador del sistema. Hacé doble clic en el archivo .exe, seguí los pasos de instalación y cuando abra la app te va a pedir una clave de activación. Te la mando en un momento."*

---

## 5. Crear la licencia

> Hacés esto desde **tu** instalación de la app (la que tiene `isAdmin: true`).

### Abrir el panel de Licencias

1. Abrí tu app
2. En el menú lateral → **Licencias**

### Crear nueva licencia

1. Click en **Nueva licencia**
2. Completá:
   - **Nombre del cliente:** Florería Martínez
   - **Fecha de vencimiento:** seleccioná 1 mes desde hoy (o usá el botón +1 mes)
   - **Días de gracia:** 15 (por defecto)
   - **Notas:** podés anotar teléfono, email, etc.
3. Click en **Guardar**

### La clave se genera automáticamente

Aparece una pantalla con la clave, por ejemplo:
```
GCOM-A3F9-X2K1-8BPQ
```

4. Click en **Copiar clave**
5. Cerrá el modal

### Enviar la clave al cliente

Mandala por WhatsApp o email:

---
*"Tu clave de activación es: **GCOM-A3F9-X2K1-8BPQ**
Abrí la app, ingresá la clave y listo. Cualquier duda me avisás."*

---

## 6. Activación del cliente

El cliente ve esta pantalla al abrir la app por primera vez:

```
┌─────────────────────────────┐
│     Activar aplicación      │
│                             │
│  Ingresá la clave de        │
│  activación que recibiste   │
│                             │
│  [ GCOM-A3F9-X2K1-8BPQ ]   │
│                             │
│       [ Activar ]           │
└─────────────────────────────┘
```

1. Ingresa la clave
2. Click en **Activar**
3. La app valida contra Supabase y queda habilitada

> La activación requiere conexión a internet una sola vez. Después puede trabajar offline hasta 15 días sin volver a verificar.

---

## 7. Mantenimiento mensual

### El cliente pagó → extender la licencia

1. Abrí tu app → **Licencias**
2. Encontrá al cliente en la tabla
3. Click en el botón **+1 mes** (ícono verde en la columna Acciones)
4. Confirmá la nueva fecha
5. Listo — el cliente no necesita hacer nada, la próxima vez que abra la app ya valida con la fecha extendida

### El cliente no pagó → desactivar

1. Abrí tu app → **Licencias**
2. Encontrá al cliente
3. Apagá el toggle en la columna **Activa**
4. La próxima vez que el cliente abra la app (o cuando venzan los 15 días de gracia offline) ve la pantalla de bloqueo

### El cliente volvió a pagar → reactivar

1. Mismos pasos que desactivar, pero activando el toggle
2. Y si venció, también extendés la fecha con **+1 mes**

### Columna "Última conexión"

Indica cuándo fue la última vez que ese cliente verificó su licencia online:

| Color | Significado |
|---|---|
| 🟢 Verde (Hoy) | Abrió la app hoy |
| 🔵 Azul (1-7d) | Normal |
| 🟠 Naranja (8-15d) | Cerca del límite offline |
| 🔴 Rojo (+15d) | Superó el límite, próxima apertura bloqueará |

---

## 8. Publicar una actualización de código

Cuando hacés cambios en el código y querés que todos los clientes lo reciban:

```bash
# 1. Hacer los cambios en el código

# 2. Actualizar la versión en package.json
# Cambiar: "version": "1.0.0" → "version": "1.1.0"

# 3. Commit y tag
git add -A
git commit -m "descripción de los cambios"
git tag v1.1.0
git push origin main --tags
```

GitHub Actions detecta el tag, genera el instalador automáticamente y lo publica en GitHub Releases.

**Los clientes reciben la actualización automáticamente** la próxima vez que abran la app. No necesitan reinstalar ni hacer nada.

### Versionado sugerido

| Tipo de cambio | Versión |
|---|---|
| Fix de bug menor | 1.0.0 → 1.0.1 |
| Nueva funcionalidad | 1.0.0 → 1.1.0 |
| Cambio grande / breaking | 1.0.0 → 2.0.0 |

---

## 9. Referencia de archivos

### Estructura del proyecto

```
gestion-comercio/
├── clients/                    ← configs por cliente (subido a git)
│   ├── floreria-martinez/
│   │   ├── client.json
│   │   └── logo.png
│   └── otro-cliente/
│       └── client.json
│
├── resources/                  ← archivos activos (se incluyen en el build)
│   ├── client.json             ← config del cliente actual (cambia por build)
│   ├── logo.png                ← logo del cliente actual (opcional)
│   └── supabase.json           ← credenciales (NO está en git, solo en tu máquina)
│
├── src/                        ← código fuente
├── dist/                       ← instaladores generados (no está en git)
└── .github/workflows/
    └── release.yml             ← publica releases automáticamente
```

### Variables por cliente en `client.json`

```json
{
  "clientId": "id-unico-sin-espacios",
  "clientName": "Nombre que ve el cliente",
  "isAdmin": false,
  "features": {
    "ventas":        true/false,
    "cotizaciones":  true/false,
    "productos":     true/false,
    "stock":         true/false,
    "proveedores":   true/false,
    "caja":          true/false,
    "reportes":      true/false,
    "usuarios":      true/false,
    "backup":        true/false,
    "configuracion": true/false
  }
}
```

### Comandos útiles

```bash
npm run dev          # correr en modo desarrollo
npm run build        # compilar sin generar instalador
npm run dist:win     # compilar + generar instalador Windows
npm run dist:linux   # compilar + generar instalador Linux
```
