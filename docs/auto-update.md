# Auto-actualización (Tauri updater)

La app se actualiza sola al abrir: consulta el `latest.json` del último release de
GitHub, y si hay una versión más nueva la descarga (verificando la firma), la
instala y reinicia. La config vive en `src-tauri/tauri.conf.json` → `plugins.updater`.

## Setup de una sola vez

### 1. Generar el par de llaves de firma

```bash
pnpm tauri signer generate -w grs-integration.key
```

Genera `grs-integration.key` (privada) y `grs-integration.key.pub` (pública), y pide
una contraseña. **La privada NO se commitea.**

### 2. Poner la clave pública en el config

Copia el contenido de `grs-integration.key.pub` a `plugins.updater.pubkey` en
`src-tauri/tauri.conf.json` (reemplaza el placeholder `REEMPLAZAR_CON_LA_CLAVE_...`).
Esta sí va al repo.

### 3. Cargar la privada como secrets del repo

En GitHub → Settings → Secrets and variables → Actions:

- `TAURI_SIGNING_PRIVATE_KEY` = contenido de `grs-integration.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = la contraseña que pusiste

Guarda `grs-integration.key` en un lugar seguro (gestor de contraseñas). Si se pierde,
hay que regenerar llaves y **todos los clientes instalados dejan de auto-actualizar**
(la nueva pública no valida los binarios que ya tienen) — habría que reinstalar a mano.

## Publicar una versión

1. Sube la versión en `src-tauri/tauri.conf.json` (`version`) y `src-tauri/Cargo.toml`.
2. Commit + tag + push del tag:

   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. El workflow `.github/workflows/release.yml` compila en Windows, firma, y crea el
   release con el instalador + `latest.json`.
4. Los clientes que ya tienen la app se actualizan solos la próxima vez que abran.

## La primera vez

El primer release hay que hacerlo con este mecanismo ya activo para que los clientes
empiecen a auto-actualizar. Una versión instalada de ANTES de este cambio (0.1.0 sin
updater) **no** se auto-actualiza: a esos usuarios hay que pasarles el instalador nuevo
una vez a mano; de ahí en adelante ya se actualizan solos.
