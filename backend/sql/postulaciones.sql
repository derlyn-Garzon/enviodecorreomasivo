-- ============================================================
-- public.postulaciones — campos de control de entrega
-- ============================================================

-- Columnas añadidas (ya aplicadas en el proyecto):
--   entregado    boolean     NOT NULL DEFAULT false
--   entregado_at timestamptz NULL

-- ------------------------------------------------------------
-- Índice parcial para el cron
-- ------------------------------------------------------------
-- El cron filtra siempre por `entregado = false` y ordena por created_at.
-- Un índice parcial solo indexa las filas pendientes, así que se mantiene
-- pequeño aunque la tabla crezca: las filas ya entregadas no ocupan espacio.
create index if not exists postulaciones_pendientes_idx
  on public.postulaciones (created_at)
  where entregado = false;

-- ------------------------------------------------------------
-- Consulta del cron (equivalente SQL del filtro de TypeScript)
-- ------------------------------------------------------------
-- select *
-- from public.postulaciones
-- where entregado = false
-- order by created_at
-- limit $1;

-- Variante defensiva para migraciones con datos antiguos: si al añadir la
-- columna existieran filas con `entregado IS NULL` (columna añadida como
-- NULLABLE y luego rellenada), `entregado = false` NO las devolvería.
-- `IS NOT TRUE` sí las incluye, porque NULL no es TRUE.
--
-- Solo tiene sentido mientras la columna admita NULL. Con el `NOT NULL
-- DEFAULT false` actual, `IS NOT TRUE` y `= false` devuelven lo mismo.
--
-- select *
-- from public.postulaciones
-- where entregado is not true
-- order by created_at
-- limit $1;

-- Normalización puntual de datos antiguos (una sola vez):
-- update public.postulaciones set entregado = false where entregado is null;
-- alter table public.postulaciones alter column entregado set not null;

-- ------------------------------------------------------------
-- Actualización tras la entrega, sellada por PostgreSQL
-- ------------------------------------------------------------
-- Alternativa a la actualización desde Node: `now()` lo genera el servidor de
-- base de datos, evitando depender del reloj del proceso que ejecuta el cron.
-- `and entregado = false` la hace idempotente.
create or replace function public.marcar_postulacion_entregada(p_id uuid)
returns public.postulaciones
language sql
as $$
  update public.postulaciones
     set entregado = true,
         entregado_at = now()
   where id = p_id
     and entregado = false
  returning *;
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
-- El frontend (Anon Key) solo necesita INSERT. El cron usa la Service Role Key,
-- que se salta RLS, así que no requiere políticas de SELECT/UPDATE.
--
-- alter table public.postulaciones enable row level security;
--
-- create policy "anon puede postular"
--   on public.postulaciones
--   for insert
--   to anon
--   with check (true);
