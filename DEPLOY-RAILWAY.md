# Despliegue en Railway

Este monorepo se despliega en Railway como **un proyecto con 4 servicios**:

| Servicio | Tipo | Origen |
|----------|------|--------|
| `Postgres` | Plugin de Railway | Base de datos |
| `Redis` | Plugin de Railway | Cache + colas (Bull) |
| `api` | Servicio desde repo | `apps/api` (Express, proceso persistente) |
| `web` | Servicio desde repo | `apps/web` (Next.js) |

El API y la web comparten el repo pero usan archivos de configuración distintos
(`apps/api/railway.json` y `apps/web/railway.json`).

---

## 1. Crear el proyecto y las bases

1. En [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → elegí `serviya`.
2. Railway crea un primer servicio desde el repo. Lo configuramos como **api** más abajo.
3. **+ New** → **Database** → **Add PostgreSQL**.
4. **+ New** → **Database** → **Add Redis**.

---

## 2. Servicio `api`

En el servicio creado desde el repo:

1. **Settings → Service Name**: `api`
2. **Settings → Config-as-code / Railway Config File**: `apps/api/railway.json`
3. **Settings → Root Directory**: dejalo **vacío** (raíz del repo).
   > Importante: NO lo pongas en `apps/api`. Las dependencias de workspace
   > (`@sp/db`) necesitan instalarse desde la raíz del monorepo.
4. **Variables** (pestaña Variables del servicio):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL=https://<tu-dominio-web>.up.railway.app
   NEXT_PUBLIC_API_URL=https://<tu-dominio-api>.up.railway.app
   PLATFORM_FEE_PERCENT=15
   MP_ACCESS_TOKEN=
   MP_WEBHOOK_SECRET=
   WA_PHONE_NUMBER_ID=
   WA_ACCESS_TOKEN=
   WA_VERIFY_TOKEN=
   RESEND_API_KEY=
   EMAIL_FROM=noreply@tudominio.com
   ```

   Las referencias `${{Postgres.DATABASE_URL}}` y `${{Redis.REDIS_URL}}` las
   inyecta Railway automáticamente al enlazar los plugins.

5. **Settings → Networking → Generate Domain** para obtener la URL pública del API.

El healthcheck ya está configurado en `/health`.

---

## 3. Servicio `web`

1. **+ New** → **GitHub Repo** → mismo repo `serviya`.
2. **Settings → Service Name**: `web`
3. **Settings → Railway Config File**: `apps/web/railway.json`
4. **Settings → Root Directory**: **vacío** (raíz del repo).
5. **Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://<tu-dominio-api>.up.railway.app
   NEXT_PUBLIC_APP_URL=https://<tu-dominio-web>.up.railway.app
   NEXTAUTH_URL=https://<tu-dominio-web>.up.railway.app
   NEXTAUTH_SECRET=<el mismo valor que en api>
   AUTH_TRUST_HOST=true
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   NEXT_PUBLIC_MP_PUBLIC_KEY=
   NEXT_PUBLIC_GTM_ID=
   NEXT_PUBLIC_META_PIXEL_ID=
   ```

   > `AUTH_TRUST_HOST=true` es necesario para NextAuth v5 detrás del proxy de Railway.
   > Las `NEXT_PUBLIC_*` se hornean en build, así que tienen que estar **antes** del deploy.

6. **Settings → Networking → Generate Domain** para la URL pública de la web.

> Después de generar ambos dominios, volvé a las variables y completá las URLs
> cruzadas (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`) con los
> valores reales y redesplegá.

---

## 4. Migraciones de base de datos

El schema vive en `packages/db/src/schema.ts` pero **todavía no hay migraciones
generadas**. Antes del primer arranque hay que generarlas y aplicarlas.

### Generar (una vez, en local)

```bash
# en la raíz del repo, con DATABASE_URL apuntando a una DB cualquiera
pnpm --filter @sp/db db:generate
git add packages/db/src/migrations && git commit -m "chore: db migrations" && git push
```

### Aplicar contra la base de Railway

Opción A — desde tu máquina con la `DATABASE_URL` pública de Railway:

```bash
DATABASE_URL="<DATABASE_URL de Railway>" pnpm --filter @sp/db db:migrate
```

Opción B — agregar un **Pre-Deploy Command** al servicio `api` en Railway:

```
pnpm --filter @sp/db db:migrate
```

(Settings → Deploy → Pre-Deploy Command). Así corre la migración en cada deploy
antes de levantar el servidor.

---

## 5. Verificar

- `https://<api>/health` → `{"status":"ok",...}`
- La web carga y puede pegarle al API (revisá la consola del navegador por errores de CORS;
  `NEXT_PUBLIC_APP_URL` en el api debe coincidir con el dominio real de la web).
