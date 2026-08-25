# Buscador SKU · Maltería Quilmes

PWA (Progressive Web App) para consultar el catálogo de productos y el armado de paletas desde el celular.

- **App en producción:** https://sku-omega.vercel.app
- **Repo:** https://github.com/riroldancmq/Sku
- **Backend:** Supabase (base de datos PostgreSQL + autenticación)

---

## Estructura del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | **Toda la app** en un solo archivo: CSS + HTML + JavaScript (~1800 líneas). Arquitectura monolítica a propósito: sin build, sin dependencias locales. |
| `service-worker.js` | Service worker de la PWA. Estrategia *cache-first* para archivos same-origin. `CACHE_NAME` controla la versión de la caché. |
| `manifest.json` | Manifiesto PWA (nombre, íconos, colores, modo standalone). |
| `icon-192.png` / `icon-512.png` | Íconos de la app para instalación. |
| `productos.json` | Snapshot de referencia de los datos iniciales. **La app ya NO lo lee**: los datos viven en Supabase. Queda como respaldo histórico. |
| `supabase-setup.sql` | Script completo de configuración de la base: tablas + políticas RLS + migración inicial de los 1246 productos y filtros. Se ejecuta desde el SQL Editor de Supabase. |
| `.gitignore` | Excluye material local (presentación PDF/imágenes). |

---

## Arquitectura

```
┌─────────────────────────────┐
│  index.html (app completa)  │
│  ├─ CSS embebido            │
│  ├─ HTML (vistas/modales)   │
│  └─ JS (lógica)             │
└──────────┬──────────────────┘
           │ supabase-js v2 (CDN jsdelivr)
           ▼
┌─────────────────────────────┐      ┌─────────────────────┐
│        Supabase             │      │  localStorage       │
│  ├─ Auth (admin)            │      │  catalogo_sku_v2    │
│  └─ Postgres + RLS          │◄────►│  (copia offline)    │
└─────────────────────────────┘      └─────────────────────┘
```

**Flujo de datos al abrir la app (`initDB()`):**

1. Consulta paralela a Supabase: tabla `products` + tablas de filtros.
2. Mapea filas snake_case → camelCase (`packs_piso` → `packsPiso`) con `mapProduct()`.
3. Guarda snapshot en `localStorage` (clave `catalogo_sku_v2`).
4. **Fallbacks si no hay conexión:** primero el snapshot de localStorage, luego un array de datos embebido dentro del propio `index.html`.

Resultado: cada vez que alguien abre la app ve los datos actualizados de la nube; sin internet sigue funcionando con lo último que cargó.

**Actualización de datos:** las escrituras (agregar/editar/borrar producto, guardar filtros) van directo a Supabase cuando hay sesión admin. Los demás usuarios las ven la próxima vez que abran o recarguen la app.

---

## Base de datos (Supabase)

Proyecto: `psllstxgbkaklbofpzkv` · URL: `https://psllstxgbkaklbofpzkv.supabase.co`

| Tabla | Columnas | Uso |
|---|---|---|
| `products` | `id` (PK identity), `sku`, `"desc"`, `pisos`, `packs_piso`, `packs_paleta`, `created_at` | Catálogo. Ojo: `"desc"` va entre comillas porque es palabra reservada. No hay unique en `sku` (existen SKUs duplicados históricos). |
| `filter_groups` | `id`, `label`, `color`, `sort_order` | Categorías (CERVEZAS, GASEOSAS, AGUA, VINO, SPIRIT, ALIMENTOS). |
| `filter_brands` | `id`, `group_id` (FK cascade), `label`, `key`, `sort_order` | Marcas/sub-filtros de cada categoría. |

**Seguridad (RLS activada en las 3 tablas):**
- `lectura_publica`: cualquier visitante puede leer (`for select using (true)`).
- `admin_escritura`: solo usuarios autenticados pueden escribir (`for all to authenticated using (true) with check (true)`).

### Re-ejecutar supabase-setup.sql

El script crea tablas con `if not exists` pero los INSERT **duplican datos** si se corre dos veces. Para resetear la base desde cero, correr antes:

```sql
truncate table public.products, public.filter_brands, public.filter_groups
  restart identity cascade;
```

---

## Mapa del código (index.html)

Las secciones están marcadas con comentarios `// ---- SECCIÓN ----`. Funciones principales:

| Función | Qué hace |
|---|---|
| `initDB()` (async) | Carga datos desde Supabase con fallbacks offline. Se ejecuta una vez al inicio. |
| `render()` | Dibuja la lista de tarjetas según búsqueda (`query`) y filtro activo. |
| `onSearch()` / `clearSearch()` | Manejan el buscador (`#searchInput`). |
| `buildFilters()` | Construye los chips de categorías y sub-chips de marcas dinámicamente. |
| `openDetail(idx)` | Abre el modal de ficha del producto con el dibujo SVG de la paleta. |
| `saveProduct()` (async) | UPDATE o INSERT directo en Supabase (alta/edición desde formulario). |
| `deleteProduct()` (async) | DELETE en Supabase con confirmación previa. |
| `guardarFiltros()` (async) | Borra y regenera grupos/marcas de filtros en Supabase (modal admin 🗂️). |
| `toggleAdmin()` / `doLogin()` | Autenticación por email+contraseña vía `sb.auth.signInWithPassword`. El login muestra error con shake animado. |

Estado global principal: `db` (array de productos), `FILTER_GROUPS` (filtros), `activeFilter`, `activeGroup`, `isAdmin`.

---

## Guía para cambios frecuentes

### ✏️ Agregar o editar productos
**No hace falta tocar código:** entrar a la app como admin (⚙️ → email + contraseña) y usar ➕ o editar la tarjeta. Queda guardado en Supabase para todos.

### 🛠️ Modificar código de la app
1. Editar `index.html` (todo vive ahí).
2. **Si cambió algo del HTML/CSS/JS visible: subir `CACHE_NAME` en `service-worker.js`** (actualmente `sku-quilmes-v10` → pasar a `v11`). Sin este paso los celulares pueden seguir viendo la versión vieja cacheada.
3. Commit + push a `main`.
4. Vercel deploya automáticamente (~30 seg) → listo.

### 🗂️ Cambiar categorías o marcas de filtros
Preferentemente desde la app como admin (modal Filtros). También es posible por SQL editando `filter_groups` / `filter_brands` (los `key` de las marcas se usan como valor de `activeFilter`).

### 💾 Backup de datos
Supabase Dashboard → Table editor → tabla `products` → Export CSV. (El botón de exportar JSON fue eliminado de la app porque quedó obsoleto).

### 📦 Material de presentación
El PDF de presentación y sus imágenes viven solo en local (`presentacion-sku.pdf` y `presentacion-img/`, ignorados por git).

---

## Historial de cambios

| Fecha | Commit | Cambio |
|---|---|---|
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

- La clave `SUPABASE_KEY` incluida en `index.html` es la clave **publishable/anónima**: está diseñada para ser pública y solo permite leer (RLS bloquea escrituras anónimas).
- **Nunca subir al repo** la `service_role` key ni ninguna clave secreta de Supabase.
- Las credenciales de admin (usuario y contraseña) se crean manualmente en Supabase Dashboard → Authentication → Users. No existen en el código.
