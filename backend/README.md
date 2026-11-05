# Backend — postulaciones (Supabase)

Backend Node.js/TypeScript sobre Supabase para `public.postulaciones`, con el
control de entrega al reclutador.

## Esquema de entrega

| Columna | Tipo | Notas |
|---|---|---|
| `entregado` | `boolean NOT NULL DEFAULT false` | `false` = pendiente de enviar |
| `entregado_at` | `timestamptz NULL` | Se sella al entregar |

## Comandos

```bash
npm install        # instalar dependencias
npm run typecheck  # solo comprobación de tipos
npm run build      # typecheck + compilación a dist/
npm run dev        # cron en modo desarrollo (tsx watch)
npm run cron       # una sola pasada del cron
npm start          # cron compilado
```

## Configuración

Copia `.env.example` a `.env` y rellena los valores. `.env` está en
`.gitignore`: la Service Role Key nunca debe subir al repositorio.

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Se salta RLS; necesaria para leer y actualizar |
| `RECRUITER_ENDPOINT` | Endpoint que recibe cada postulación |
| `RECRUITER_TOKEN` | Bearer opcional |
| `CRON_BATCH_SIZE` | Máximo de postulaciones por pasada (por defecto 50) |

## Los tres puntos

### 1. Inserción

`src/services/postulaciones.service.ts` → `crearPostulacion`

No se envían `entregado` ni `entregado_at`: la base de datos aplica
`DEFAULT false` y `NULL`.

```ts
const { data, error } = await supabase
  .from('postulaciones')
  .insert({ company_email: email, job_language: lang })
  .select()
  .single();
```

### 2. Consulta del cron

`obtenerPendientes` filtra por `entregado = false` y ordena por `created_at`.

```ts
const { data, error } = await supabase
  .from('postulaciones')
  .select('*')
  .eq('entregado', false)
  .order('created_at', { ascending: true })
  .limit(limit);
```

Con el `NOT NULL DEFAULT false` actual, `= false` es correcto y deja usar el
índice parcial. La variante defensiva `IS NOT TRUE` (útil solo si la columna
admitiera `NULL` por una migración antigua) está documentada en
`sql/postulaciones.sql`.

### 3. Actualización tras la entrega

`marcarEntregada` pone `entregado = true` y `entregado_at` en una sola
sentencia. El `.eq('entregado', false)` la hace idempotente: si dos pasadas se
solapan, solo una actualiza la fila.

```ts
const { data, error } = await supabase
  .from('postulaciones')
  .update({ entregado: true, entregado_at: new Date().toISOString() })
  .eq('id', id)
  .eq('entregado', false)
  .select()
  .single();
```

Para sellar la marca de tiempo con `now()` de PostgreSQL en vez del reloj del
proceso Node, usa la función RPC `marcar_postulacion_entregada(uuid)` definida
en `sql/postulaciones.sql`.

## Flujo del cron

`src/jobs/enviarPendientes.ts` ejecuta el ciclo completo: leer pendientes, enviar
al reclutador y marcar como entregada. Una fila solo se marca si el envío
devuelve 2xx; si falla, se registra y queda pendiente para el próximo ciclo.

## Estructura

```
src/
  config/env.ts                        validación de variables de entorno
  lib/supabase.ts                      cliente con Service Role Key
  lib/recruiter.ts                     envío HTTP al reclutador
  services/postulaciones.service.ts    insert / pendientes / marcar entregada
  jobs/enviarPendientes.ts             ciclo del cron
  index.ts                             programador por intervalo
  types/database.ts                    tipos del esquema
sql/postulaciones.sql                  índice parcial, RPC y notas de migración
```
