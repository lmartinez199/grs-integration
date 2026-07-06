# Onboarding para desarrolladores — Integración GRS

Guía para entender el proyecto desde cero: qué es, cómo encaja en el ecosistema, qué tecnología usa, cómo está organizado el código y cómo correrlo.

## 1. Qué es

**Integración GRS** es una aplicación de escritorio (Windows) para el operador técnico del evento **JJB2026**. Su trabajo es llevar los resultados deportivos desde los sistemas de cada proveedor (Arena, Zempo, CBAT, IANSEO, SwimSystem, SportTech) hacia el **GRS** (el sistema central de gestión de resultados).

Desde la app el operador puede:

- Iniciar/detener la sincronización de cada disciplina (automática o manual).
- Ver en el dashboard el estado en vivo de todas las disciplinas (se refresca cada 15 s).
- Ejecutar los pasos de setup de cada integración (crear estructura del evento, participantes, grupos, resultados).
- Revisar el historial de sync con errores agrupados por causa.
- Configurar URLs y credenciales de los servicios.

El manual de uso (con capturas) está en [manual-usuario.md](manual-usuario.md).

## 2. El ecosistema

La app no habla directo con los proveedores deportivos: consume 3 APIs REST que hacen el trabajo pesado.

```
Proveedores (Arena, Zempo, CBAT, ...)          Esta app (Tauri)
        │                                            │
        ▼                                            ▼
┌────────────────────┐   ┌──────────────────────────────────────┐
│ jud-integration-   │◄──┤                                      │
│ zempo (judo)       │   │                                      │
├────────────────────┤   │        Integración GRS               │
│ ath-microservice   │◄──┤        (panel del operador)          │
│ (atletismo)        │   │                                      │
├────────────────────┤   │                                      │
│ grs-backend-v2     │◄──┤                                      │
│ (monolito: login + └───┴──────────────────────────────────────┘
│  resto de deportes)
└────────────────────┘
```

| Servicio | Rol | Base URL por defecto | Auth |
|---|---|---|---|
| **grs-backend-v2** (monolito) | Login (JWT) + endpoints de la mayoría de los deportes | `http://localhost:3010/api` | JWT `Bearer` |
| **jud-integration-zempo** | Orquestador del sync de judo | `http://localhost:3001/zempo` | API key `Bearer` |
| **ath-microservice** | ACL de atletismo (CBAT → GRS) | `http://localhost:3005/api/ath` | API key `Bearer` (opcional) |

> Los dos microservicios migrarán al monolito en el futuro. Por eso su acceso está aislado en `src/api/zempo/` y `src/api/ath/`: la migración solo cambia la base URL y el módulo de cliente.

### Disciplinas

| Código | Deporte | Proveedor | Cliente en la app |
|---|---|---|---|
| WRE | Lucha | Arena | `src/api/grs/arena.ts` |
| JUD | Judo | Zempo | `src/api/zempo/` + `src/api/grs/judo.ts` y `zempo-sync.ts` |
| ATH | Atletismo | CBAT | `src/api/ath/` |
| ARC | Tiro con arco | IANSEO | `src/api/grs/arco.ts` |
| SWM | Natación | SwimSystem | `src/api/grs/swimsystem.ts` |
| GAR / GRY | Gimnasia artística / rítmica | SportTech | `src/api/grs/sporttech.ts` |

## 3. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Shell de escritorio | **Tauri 2** (Rust) |
| UI | **React 19** + **TypeScript** + **Vite 7** |
| Estilos | **Tailwind CSS 4** + componentes propios estilo shadcn/ui |
| Estado de servidor | **TanStack Query v5** |
| Estado de cliente | **Zustand 5** (con persistencia propia) |
| Routing | **React Router 7** (HashRouter) |
| Formularios | **React Hook Form + Zod** |
| Toasts | **sileo** (envuelto en `src/components/ui/toast.tsx`) |
| HTTP | **tauri-plugin-http** (las peticiones salen por Rust) |
| Persistencia local | **tauri-plugin-store** → archivo `grs-desktop.json` (JWT + configuración) |

**Por qué Tauri y no una web/Electron:** las peticiones HTTP salen por el cliente nativo de Rust, **fuera del WebView**, así que el CORS restringido de zempo/ath no afecta. Además el bundle es un instalador Windows liviano (MSI/NSIS).

## 4. Arquitectura

Flujo de una petición típica:

```
features/ (página) → hook de TanStack Query → src/api/{grs,zempo,ath}/ (cliente)
    → src/lib/http.ts  request(service, path)  → tauri-plugin-http (Rust, sin CORS)
```

Responsabilidades por capa:

```
src/
├── api/                # Clientes HTTP por servicio. No conocen la UI.
│   ├── grs/            #   Monolito: auth, arena, judo, arco, swimsystem, sporttech, integrations
│   ├── zempo/          #   Microservicio de judo (aislado para la futura migración)
│   └── ath/            #   Microservicio de atletismo (ídem)
├── lib/
│   ├── http.ts         # request() central: resuelve base URL + auth por servicio, ApiError
│   ├── query.ts        # QueryClient configurado
│   ├── constants.ts    # SYNC_INTERVAL (15 s), staleTime, retries
│   ├── utils.ts        # cn() para clases Tailwind
│   └── domain/         # Helpers puros por deporte (sin side effects): arena-fight, ath-start-list, zempo
├── stores/             # Zustand: auth, settings (URLs/keys), theme + uno por deporte
│   └── persist.ts      # Hidratación desde grs-desktop.json (tauri-plugin-store)
├── components/
│   ├── AppLayout.tsx   # Shell con navegación lateral
│   ├── ui/             # Primitivos reutilizables (ver §5)
│   └── integration/    # Piezas de sync compartidas entre deportes (ver §5)
├── features/           # Una carpeta por página: auth, dashboard, arena, judo, ath,
│                       # arco, swimsystem, sporttech, config
│                       # (las rutas viejas /integrations y /settings redirigen a /config en App.tsx)
└── App.tsx             # Rutas (HashRouter) + hidratación de stores al arrancar
```

Reglas prácticas:

- `api/` no importa nada de React ni de la UI; solo tipos y `lib/http.ts`.
- `lib/domain/` son funciones puras: fáciles de testear y de razonar.
- Todo estado que debe sobrevivir al cierre de la app pasa por `stores/persist.ts` (nunca `localStorage`).
- La configuración (URLs, API keys) **no vive en `.env`**: se ingresa en la UI (Configuración → Conexiones) y se guarda en `grs-desktop.json`.

## 5. Código reutilizable — no reinventar

Antes de escribir algo nuevo, revisa este catálogo:

- **`src/lib/http.ts` → `request(service, path, opts)`**: único punto de salida HTTP. Resuelve base URL y headers de auth según el servicio (`"grs" | "zempo" | "ath"`), lanza `ApiError` tipado y fuerza logout en 401. **Nunca uses `fetch` directo.**
- **`src/hooks/useMutationWithToast.ts`**: mutación de TanStack Query con toast de éxito/error incluido.
- **`src/components/ui/`**: primitivos — `button`, `input`, `card`, `badge`, `label`, `tabs`, `toast`, `status-badge`, `sync-card`, `data-view`, `table-view`, `definition-row`, `competitor-row`, `action-button`, `retry-notice`. Usa estos en vez de crear variantes. ESLint refuerza la parte automatizable: un `<input>` de texto crudo fuera de `ui/` es error de lint (checkbox/radio/file crudos son válidos porque no tienen primitivo).
- **`src/components/integration/`**: piezas compartidas entre deportes — `setup-steps`, `run-history`, `sync-history-card`, `active-event-selector`, `event-list-editor`, `integration-info-rows`.
- **`src/lib/domain/`**: helpers puros por deporte; si tu lógica no toca la red ni la UI, va aquí.
- **Patrón de stores**: los deportes que necesitan estado local propio (arena, judo, ath, arco) tienen su `*.store.ts` con el mismo esqueleto; swm y sporttech viven solo de TanStack Query. Si necesitas uno, copia un store existente (p. ej. `arco.store.ts`).

### Receta: agregar un deporte nuevo

1. Cliente en `src/api/` (en `grs/` si va por el monolito, o carpeta propia si es microservicio).
2. Store en `src/stores/<deporte>.store.ts` **solo si hace falta estado local** (copiar esqueleto de uno existente); si todo viene del backend, basta TanStack Query.
3. Carpeta en `src/features/<deporte>/` con la página, reusando `components/integration/` y `components/ui/`.
4. Ruta en `src/App.tsx` + entrada en la navegación de `components/AppLayout.tsx`.
5. Tarjeta de estado en `src/features/dashboard/`.

## 6. Cómo correrlo

### Requisitos

- Node.js + **pnpm**
- Rust (rustup) + **Visual Studio C++ Build Tools** (linker MSVC, requerido por Tauri en Windows)
- WebView2 (preinstalado en Windows 11)

### Desarrollo

```bash
pnpm install
pnpm tauri dev     # Vite + ventana Tauri con hot reload
pnpm dev           # solo Vite en el navegador (sin ventana Tauri; el HTTP nativo no funciona aquí)
```

Necesitas los 3 backends corriendo localmente (`grs-backend-v2`, `jud-integration-zempo`, `ath-microservice`).

> ⚠️ **Conflicto de puertos:** zempo y ath usan ambos `3001` por defecto en sus repos. Reasigna uno; la app asume ath en `3005`.

Al abrir la app: login contra el GRS (`POST /api/auth/login`) y luego **Configuración → Conexiones** para ingresar URLs y API keys (se guardan localmente en `grs-desktop.json`).

### Build y checks

```bash
pnpm build              # typecheck (tsc) + build de frontend
pnpm tauri build        # instalador Windows (MSI/NSIS) en src-tauri/target/release/
pnpm exec tsc --noEmit  # solo typecheck
pnpm lint               # ESLint (JS/TS recomendadas + hooks de React + convenciones del proyecto)
```

No hay tests automatizados por ahora; typecheck + lint son la verificación local.

## 7. Documentación relacionada

- [README.md](../README.md) — quick-start técnico.
- [manual-usuario.md](manual-usuario.md) — manual del operador, con capturas ([img/](img/)). También en PDF/DOCX.
- [plan-resultados-en-horario.md](plan-resultados-en-horario.md) — spec técnica de resultados en vivo para atletismo.
