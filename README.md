# Buscador SKU · Maltería Quilmes

PWA (Progressive Web App) para consultar el catálogo de productos y el armado de paletas desde el celular.

- **App en producción:** https://sku-omega.vercel.app
- **Repo:** https://github.com/riroldancmq/Sku
- **Backend:** InsForge (base de datos PostgreSQL + autenticación + RLS)

---

## Estructura del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | **Toda la app** en un solo archivo: CSS + HTML + JavaScript (~1800 líneas). Arquitectura monolítica a propósito: sin build, sin dependencias locales. |
| `service-worker.js` | Service worker de la PWA. Estrategia *cache-first* para archivos same-origin. `CACHE_NAME` controla la versión de la caché. |
| `manifest.json` | Manifiesto PWA (nombre, íconos, colores, modo standalone). |
| `icon-192.png` / `icon-512.png` | Íconos de la app para instalación. |
| `productos.json` | Snapshot histórico de referencia de los datos iniciales. **La app ya NO lo lee**: los datos viven en InsForge. Queda como respaldo histórico. |
| `migrations/` | Migraciones SQL de InsForge (se aplican con `npx @insforge/cli db migrations up`). `20261008204044_init-sku-schema.sql` crea tablas + RLS + grants + siembra de los 1246 productos y filtros. |
| `supabase-setup.sql` | **Histórico:** script equivalente que se usaba con Supabase. Conservado solo como referencia. |
| `insforge.toml` | Config de auth del proyecto InsForge (redirects, verificación de email, signup). Se aplica con `npx @insforge/cli config apply`. |
| `.insforge/project.json` | Link del repo al proyecto InsForge. **Ignorado por git** (contiene la `api_key` admin). |
| `.gitignore` | Excluye material local (presentación PDF/imágenes) y secretos de InsForge (`.insforge`, `.env*`). |

---

## Arquitectura

```
┌─────────────────────────────┐
│  index.html (app completa)  │
│  ├─ CSS embebido            │
│  ├─ HTML (vistas/modales)   │
│  └─ JS (lógica)             │
└──────────┬──────────────────┘
           │ @insforge/sdk (CDN jsdelivr, ESM)
           ▼
┌─────────────────────────────┐      ┌─────────────────────┐
│         InsForge            │      │  localStorage       │
│  ├─ Auth (admin)            │      │  catalogo_sku_v2    │
│  └─ Postgres + RLS          │◄────►│  (copia offline)    │
└─────────────────────────────┘      └─────────────────────┘
```

**Flujo de datos al abrir la app (`initDB()`):**

1. Carga el SDK con `import('https://cdn.jsdelivr.net/npm/@insforge/sdk/+esm')` (import dinámico, sin build).
2. Consulta paralela a InsForge: tabla `products` + tablas de filtros.
3. Mapea filas snake_case → camelCase (`packs_piso` → `packsPiso`) con `mapProduct()`.
4. Guarda snapshot en `localStorage` (clave `catalogo_sku_v2`).
5. **Fallbacks si no hay conexión:** primero el snapshot de localStorage, luego un array de datos embebido dentro del propio `index.html`.

Resultado: cada vez que alguien abre la app ve los datos actualizados de la nube; sin internet sigue funcionando con lo último que cargó.

> El SDK de InsForge usa internamente `@supabase/postgrest-js`, por lo que la API de datos es prácticamente idéntica a la de supabase-js (`insforge.database.from(...)`). La única diferencia práctica: `insert()` recibe **array** (`.insert([{...}])`).

**Actualización de datos:** las escrituras (agregar/editar/borrar producto, guardar filtros) van directo a InsForge cuando hay sesión admin. Los demás usuarios las ven la próxima vez que abran o recarguen la app.

---

## Base de datos (InsForge)

Proyecto: `sku-quilmes` · URL: `https://fzbpvit8.us-east.insforge.app` · Dashboard: https://insforge.dev/dashboard/project/7264e2b3-bf96-4604-a814-4b2f9079af90

| Tabla | Columnas | Uso |
|---|---|---|
| `products` | `id` (PK identity), `sku`, `"desc"`, `pisos`, `packs_piso`, `packs_paleta`, `created_at` | Catálogo. Ojo: `"desc"` va entre comillas porque es palabra reservada. No hay unique en `sku` (existen SKUs duplicados históricos). |
| `filter_groups` | `id`, `label`, `color`, `sort_order` | Categorías (CERVEZAS, GASEOSAS, AGUA, VINO, SPIRIT, ALIMENTOS). |
| `filter_brands` | `id`, `group_id` (FK cascade), `label`, `key`, `sort_order` | Marcas/sub-filtros de cada categoría. |

**Seguridad (RLS activada en las 3 tablas):**
- `lectura_publica`: cualquier visitante puede leer (`for select using (true)`).
- `admin_escritura`: solo usuarios autenticados pueden escribir (`for all to authenticated using (true) with check (true)`).
- Además de las políticas, la migración hace `GRANT` explícitos a los roles `anon` y `authenticated`.

**Auth:** la app usa `insforge.auth` (email + contraseña). Config: verificación de email **por código de 6 dígitos** para recuperar contraseña, y **signup deshabilitado** (solo existe el usuario admin, que no se puede registrar desde la app).

### Aplicar/re-ejecutar la migración

```bash
npx -y @insforge/cli db migrations up --all
```

> El `truncate` + re-Seed se hace solo si querés resetear los datos (borra ediciones hechas desde la app). Para consultas SQL ad-hoc: `npx -y @insforge/cli db query "<sql>"`.

---

## Mapa del código (index.html)

Las secciones están marcadas con comentarios `// ---- SECCIÓN ----`. Funciones principales:

| Función | Qué hace |
|---|---|
| `initDB()` (async) | Carga datos desde InsForge con fallbacks offline. Se ejecuta una vez al inicio (vía bootstrap). |
| `render()` | Dibuja la lista de tarjetas según búsqueda (`query`) y filtro activo. |
| `onSearch()` / `clearSearch()` | Manejan el buscador (`#searchInput`). |
| `buildFilters()` | Construye los chips de categorías y sub-chips de marcas dinámicamente. |
| `openDetail(idx)` | Abre el modal de ficha del producto con el dibujo SVG de la paleta. |
| `saveProduct()` (async) | UPDATE o INSERT directo en InsForge (alta/edición desde formulario). El insert va en array: `insert([payload])`. |
| `openDeleteConfirm(idx)` | Abre el modal de confirmación de borrado con el resumen del producto (SKU, descripción, pisos/bultos/total). |
| `confirmDelete()` (async) | Ejecuta el DELETE en InsForge (o solo local si no hay conexión), cierra modales, toast y re-render. |
| `guardarFiltros()` (async) | Borra y regenera grupos/marcas de filtros en InsForge (modal admin 🗂️). |
| `toggleAdmin()` / `doLogin()` | Autenticación por email+contraseña vía `insforge.auth.signInWithPassword`. |
| `forgotPass()` / `saveNewPassword()` | Recuperación de contraseña por **código de 6 dígitos**: `sendResetPasswordEmail()` → `exchangeResetPasswordToken()` → `resetPassword()`. |
| `bootstrap()` | IIFE que carga el SDK de InsForge por import dinámico desde CDN, restaura la sesión admin si existe (`getCurrentUser()`) y arranca `initDB()`. |

Estado global principal: `db` (array de productos), `FILTER_GROUPS` (filtros), `activeFilter`, `activeGroup`, `isAdmin`.

---

## Guía para cambios frecuentes

### ✏️ Agregar o editar productos
**No hace falta tocar código:** entrar a la app como admin (⚙️ → email + contraseña) y usar ➕ o editar la tarjeta. Queda guardado en InsForge para todos.

### 🛠️ Modificar código de la app
1. Editar `index.html` (todo vive ahí).
2. **Si cambió algo del HTML/CSS/JS visible: subir `CACHE_NAME` en `service-worker.js`** (actualmente `sku-quilmes-v15` → pasar a `v16`). Sin este paso los celulares pueden seguir viendo la versión vieja cacheada.
3. Commit + push a `main`.
4. Vercel deploya automáticamente (~30 seg) → listo.

### 🗂️ Cambiar categorías o marcas de filtros
Preferentemente desde la app como admin (modal Filtros). También es posible por SQL editando `filter_groups` / `filter_brands` (los `key` de las marcas se usan como valor de `activeFilter`).

### 🔐 Recuperar la contraseña del admin
Desde la app: login → "Olvidé mi contraseña" → se envía un **código de 6 dígitos** por mail → ingresás código + contraseña nueva. (Si el código expira, pedí uno nuevo.)

### 💾 Backup de datos
```bash
npx -y @insforge/cli db query "select * from public.products order by id" --json > backup-productos.json
```
(Cada tabla por separado; `products`, `filter_groups`, `filter_brands`.)

### 📦 Material de presentación
El PDF de presentación y sus imágenes viven solo en local (`presentacion-sku.pdf` y `presentacion-img/`, ignorados por git).

---

## Historial de cambios

| Fecha | Commit | Cambio |
|---|---|---|
| 10/10/2026 | (este cambio) | **Borrado múltiple de SKUs (solo admin):** presión sostenida (~500ms) sobre una tarjeta activa el modo selección (borde amarillo 3px + tilde ✓), toques cortos alternan la selección, barra inferior fija con contador `🗑 Eliminar (N)` y salida con `✕`/`Escape`. Un modal con resumen de todos los productos (SKU + descripción) confirma el borrado en lote. Búsqueda, filtros y comportamiento click-to-open se conservan. SW → v16. |
| 09/10/2026 | (este cambio) | Confirmación de eliminación con modal propio (tema de la app) en vez del `confirm()` nativo: muestra resumen del producto (SKU, descripción, pisos/bultos/total) antes de borrar. SW → v15. |
| 08/10/2026 | `83e3343` | **Migración de Supabase → InsForge.** Backend nuevo: proyecto `sku-quilmes` (Postgres + RLS + GRANTs + auth por email). `index.html` usa el SDK de InsForge por CDN (la capa de datos es la misma de PostgREST). Recuperación de contraseña por código de 6 dígitos. **Bug crítico arreglado:** el array de fallback embebido tenía 533 valores `None` (inválidos en JS) → si no había conexión ni snapshot válido, la lista quedaba vacía. Ahora valida snapshot no vacío y cae al embebido (1298 productos). `supabase-setup.sql` queda como histórico. SW → v12. |
| 27/08/2026 | `cf674f3` | Scrollbars ocultos a nivel global (`html { scrollbar-width: none }` + `::-webkit-scrollbar { display: none }`): se veían en el webview del simulador de VS Code y en PC, pero en celulares reales no. SW → v11. |
| 24/08/2026 | `2cfafa5` | En PC (≥600px) la app se muestra como columna de 430px centrada con ancho de celular; en teléfonos no cambia nada. SW → v10. |
| 24/08/2026 | `6693073` | Recuperación de contraseña admin: botón "Olvidé mi contraseña" en el login + pantalla de nueva contraseña que se abre sola al entrar desde el mail (evento `PASSWORD_RECOVERY`). SW → v9. |
| 22/08/2026 | `f3a71bc` | Paginación en `initDB()`: la API de Supabase corta las respuestas en 1000 filas, por lo que los productos con id > 1000 nunca cargaban. SW → v8. |
| 22/08/2026 | `b17f9fe` | SW *network-first* para navegaciones: la página se actualiza sola cuando hay internet (la caché queda solo como fallback offline). SW → v7. |
| 22/08/2026 | `4103fc5` | La copia offline de localStorage se actualiza al agregar/editar/borrar productos + aviso visible ("Sin conexión") al arrancar con el fallback. SW → v6. |
| 22/08/2026 | `66ff3d8` | Matching de filtros por clave con límites de palabra (`\b`): RB ya no matchea yerba/carbónico; los espacios en la clave son flexibles. SW → v5. |
| 22/08/2026 | `eaef867` | Los filtros aceptan claves múltiples separadas por coma (ej: clave `RED BULL,RB` = un solo chip para ambas variantes). SW → v4. |
| 21/08/2026 | `41d87ff` | Eliminado el botón "⬇ JSON" del panel admin. SW → v3. |
| 21/08/2026 | `2f4a6d4` | Eliminado por completo el feature "peso de paletas" (UI + datos). Reemplazado login con contraseña fija por Supabase Auth (email + contraseña). Datos movidos a Supabase (lectura pública / escritura autenticada). Cache offline con localStorage. SW → v2. |

---

## Seguridad

- La clave `INSFORGE_ANON_KEY` incluida en `index.html` es la clave **anónima/publishable**: está diseñada para ser pública y solo permite leer (RLS bloquea escrituras anónimas).
- **Nunca subir al repo** la `api_key` del proyecto (vive en `.insforge/project.json` y en `.env*`, ambos ignorados por git). Es una clave admin con acceso total.
- **Signup deshabilitado** en InsForge (`disable_signup = true` en `insforge.toml`): nadie puede registrarse y obtener permisos de escritura. Solo existe el usuario admin.
- El usuario admin (email + contraseña) se creó por API/SDK de InsForge y se recupera por mail si se pierde la contraseña. No existe en el código.
