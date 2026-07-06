# Integración GRS

Panel de operador de escritorio para el evento **JJB2026**.

> 🧭 ¿Nuevo en el proyecto? Empieza por [docs/onboarding-dev.md](docs/onboarding-dev.md).

Consume 3 APIs REST:

| Servicio | Rol | Base URL por defecto | Auth |
|---|---|---|---|
| **grs-backend-v2** (monolito) | Login + endpoints de lucha (ARENA), judo, arco, natación, gimnasia e integraciones. | `http://localhost:3010/api` | JWT `Bearer` |
| **jud-integration-zempo** | Orquestador de sync de judo. | `http://localhost:3001/zempo` | API key `Bearer` |
| **ath-microservice** | ACL de atletismo (CBAT → GRS). | `http://localhost:3005/api/ath` | API key `Bearer` (opcional) |

> Los dos microservicios migrarán al monolito en el futuro. Su acceso está aislado en `src/api/zempo` y `src/api/ath`, de modo que esa migración sólo cambia la base URL y el módulo de cliente.

## Stack

- **Tauri 2** (shell de escritorio, Rust). Las peticiones HTTP salen por `tauri-plugin-http` (Rust), **fuera del WebView**, por lo que el CORS restringido de zempo/ath no afecta.
- **React 19 + Vite 7 + TypeScript**.
- **Tailwind CSS 4** + componentes propios estilo **shadcn/ui**.
- **TanStack Query v5** (estado de servidor) + **Zustand** (sesión/ajustes).
- **React Router 7** (HashRouter) · **React Hook Form + Zod** (formularios).
- Persistencia local con **tauri-plugin-store** (`grs-desktop.json`): JWT de sesión y ajustes.

## Estructura

```
src/
├── api/{grs,zempo,ath}/   # clientes por servicio (desacoplados)
├── lib/{http,query,utils} # cliente HTTP (plugin-http), QueryClient, cn()
├── stores/                # auth.store, settings.store, persist
├── components/ui/         # primitivos: button, input, card, badge, toast, tabs, ...
├── components/integration/# piezas de sync compartidas entre deportes
├── components/AppLayout   # shell con navegación lateral
└── features/{auth,dashboard,arena,judo,ath,arco,swimsystem,sporttech,config}
```

## Requisitos

- Node + pnpm
- Rust (rustup) + **Visual Studio C++ Build Tools** (linker MSVC, requerido por Tauri en Windows)
- WebView2 (preinstalado en Windows 11)

## Desarrollo

```bash
pnpm install
pnpm tauri dev     # levanta Vite + ventana Tauri
```

Con los 3 backends corriendo localmente. Configura URLs y API keys en **Configuración → Conexiones** dentro de la app (se guardan localmente). El login usa `POST /api/auth/login` (usuario + contraseña) contra el GRS.

> ⚠️ **Conflicto de puertos:** zempo y ath usan ambos `3001` por defecto en sus repos. Reasigna uno (la app asume ath en `3005`).

## Build

```bash
pnpm build         # frontend
pnpm tauri build   # instalador Windows (MSI/NSIS)
```

## Scripts útiles

- `pnpm exec tsc --noEmit` — typecheck
- `pnpm lint` — ESLint
- `pnpm dev` — solo Vite (sin ventana Tauri)
