# Onboarding de Kat — PODEROSAS en su propio Claude

Esta guía es para que Kat pueda instalar el proyecto, loguearse con sus propios accesos y empezar a configurar poderosas.org desde su propio computador con su propio Claude, sin depender de Shei cada vez.

---

## 0. Antes de empezar

Kat ya tiene (según lo que me dijiste) accesos a:
- GitHub
- Vercel
- Supabase
- Redis (Upstash u otro proveedor de Redis)

**Importante sobre las cuentas duplicadas:**

Hay dos cuentas en varios de estos servicios: una de **ELMETACHO** (la cuenta personal del desarrollador anterior) y una de **PODEROSAS** (la cuenta real del proyecto, a nombre de Shei/Kat). Kat debe trabajar **siempre en la cuenta PODEROSAS**, nunca en ELMETACHO. Esto aplica al menos a:
- Supabase (dos proyectos — confirmar cuál es el de producción real antes de tocar nada)
- Vercel (dos cuentas/equipos)
- Redis

Si en algún momento Claude (el de Kat) le pide crear algo, cambiar una variable de entorno, o ejecutar un SQL, **antes de hacerlo debe confirmar que está parada en el proyecto/cuenta PODEROSAS**, no en ELMETACHO. Si tiene dudas, que pregunte antes de ejecutar.

---

## 1. Instalar lo necesario

1. **Git** → https://git-scm.com/downloads
2. **Node.js** (versión 20 o superior) → https://nodejs.org
3. **Claude Code** (la CLI) → https://claude.com/claude-code — seguir las instrucciones de instalación para su sistema operativo.
4. **GitHub CLI** (`gh`) → https://cli.github.com — necesario para que Claude pueda abrir Pull Requests.
5. **Vercel CLI** → se instala solo con `npm install -g vercel`.

Verificar que todo quedó instalado:

```powershell
git --version
node --version
gh --version
vercel --version
claude --version
```

---

## 2. Clonar el proyecto

```powershell
git clone https://github.com/PoderosasORG/poderosas.git
cd poderosas
npm install
```

(Si el repositorio tiene otro nombre o está bajo otra organización en GitHub, ajustar la URL — Kat debe verlo en su propio acceso a GitHub.)

---

## 3. Login en cada herramienta (con la cuenta PODEROSAS)

### GitHub

```powershell
gh auth login
```
Elegir GitHub.com → HTTPS → loguearse con el navegador, usando la cuenta de GitHub de **PODEROSAS** (la organización `PoderosasORG`, no una cuenta personal del dev anterior).

Verificar:
```powershell
gh auth status
gh repo view PoderosasORG/poderosas
```

### Vercel

```powershell
vercel login
```
Usar el correo/cuenta del equipo **PODEROSAS** en Vercel, no ELMETACHO.

Verificar que está en el proyecto correcto:
```powershell
vercel link
```
Esto pregunta a qué proyecto de Vercel conectar la carpeta local — elegir el equipo/scope **PODEROSAS** y el proyecto `poderosas` (o el nombre real que tenga ahí). Si aparecen dos opciones de equipo, confirmar con Shei cuál es antes de elegir.

### Supabase

Kat no necesita instalar la CLI de Supabase para trabajar día a día — el acceso relevante es por el **dashboard web** (https://supabase.com/dashboard). Ahí también hay dos cuentas/proyectos: debe entrar siempre al proyecto bajo la organización/cuenta **PODEROSAS**, revisar el nombre del proyecto y la URL antes de tocar tablas o SQL.

Si Claude le pide alguna vez ejecutar una migración SQL, **igual que hace Shei**, Kat debe copiarla y pegarla ella misma en el **SQL Editor de Supabase** — Claude no debe ejecutar migraciones directamente contra la base de datos.

### Variables de entorno (`.env.local`)

El proyecto necesita un archivo `.env.local` en la raíz (no se sube a git) con estas variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
RESEND_API_KEY=
CRON_SECRET=
```

Los valores reales de Supabase y Redis salen del dashboard del proyecto **PODEROSAS** (no ELMETACHO) en cada servicio — Settings → API en Supabase, y la cadena de conexión en el panel de Redis. `RESEND_API_KEY` sale del dashboard de Resend (correos transaccionales) y `CRON_SECRET` es un valor inventado por el equipo para proteger los cron jobs (puede ser el mismo que ya usa Shei — pedírselo, no inventar uno nuevo sin avisar, porque los cron jobs en producción usan el mismo secreto en `vercel.json`/Vercel env).

**No compartan estos valores por chat de texto plano si pueden evitarlo** (ni con Claude, ni por WhatsApp) — cópienlos directo del dashboard al archivo `.env.local`.

### Vercel (variables de entorno en producción)

Las variables de arriba también deben existir en Vercel → Project Settings → Environment Variables, en el proyecto PODEROSAS. Esto normalmente ya está configurado porque el sitio está en producción; Kat solo necesita confirmarlo si Claude le dice que algo no funciona en el deploy.

---

## 4. Confirmar que todo funciona ANTES de tocar nada

Pedirle a su Claude, en su primer mensaje, que verifique esto y no siga hasta confirmarlo:

1. `gh auth status` → logueada, con la cuenta correcta.
2. `gh repo view PoderosasORG/poderosas` → puede ver el repo.
3. `vercel whoami` y `vercel link` → conectado al proyecto correcto (equipo PODEROSAS).
4. `npm run dev` levanta el sitio en `localhost:3000` sin errores (esto confirma que `.env.local` está bien puesto y que Supabase responde).
5. Abrir el dashboard de Supabase y confirmar en pantalla, antes de ejecutar cualquier SQL o cambio, que el proyecto activo es el de **PODEROSAS**.

Solo después de confirmar estos 5 puntos debe empezar a pedirle cambios de verdad a Claude.

---

## 5. Permiso para que Claude use el navegador y haga capturas/pruebas (Swift)

Para que el Claude de Kat pueda:
- Controlar su navegador (abrir el sitio, probar flujos, hacer login de prueba, tomar capturas)
- Hacer pruebas en macOS si en algún momento se necesita algo nativo (Swift/Xcode)

Debe **darle permiso explícitamente la primera vez que se lo pida** — Claude Code pregunta antes de usar estas herramientas, así que basta con aceptar cuando aparezca el aviso (no hay que configurar nada de antemano). Si usa la app de escritorio de Claude, el navegador integrado ya viene listo para usarse apenas lo autorice.

Una sola recomendación: que **nunca** acepte que Claude pegue o escriba contraseñas/API keys directamente en campos de formularios o en código que se vaya a subir a git — eso siempre debe ir a `.env.local` (que está en `.gitignore`) o copiarlo ella misma.

---

## 6. Workflow de cambios (igual al que ya usamos con Shei)

- Rama nueva por cada cambio → pruebas → commits pequeños → Claude hace `git push` → Claude abre el PR con `gh pr create` → Claude mergea directo (ya no se pide autorización para el merge, por decisión del equipo).
- Las migraciones de base de datos **nunca** las ejecuta Claude directamente: siempre se entregan como SQL en el chat para pegarlas a mano en el SQL Editor de Supabase.
- Antes de poner datos reales en algo nuevo, confirmar los límites del plan gratuito que se esté usando (Supabase, Vercel, Redis, Resend).
- Nunca abrir ni leer `.env.local` ni archivos de credenciales con Claude — si se necesita copiar un valor, pedirle que dé el comando para copiarlo al portapapeles, no que lo muestre en el chat.

---

## 7. Si algo no cuadra

Si Kat ve que un acceso la lleva a la cuenta ELMETACHO en vez de PODEROSAS (por ejemplo, un proyecto de Vercel o Supabase con otro nombre, u otro dueño), debe **detenerse y preguntarle a Shei o a Óscar antes de seguir** — no asumir cuál es el correcto.
