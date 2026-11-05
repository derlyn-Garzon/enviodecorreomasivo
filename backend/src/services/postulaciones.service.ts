import { getSupabase } from '../lib/supabase.js';
import type {
  PostulacionInsert,
  PostulacionRow,
} from '../types/database.js';

const TABLE = 'postulaciones';

/**
 * 1) Inserción de una nueva postulación.
 *
 * No se envían `entregado` ni `entregado_at`: la base de datos aplica
 * `DEFAULT false` y `NULL`. Enviar `entregado: false` explícito también sería
 * válido, pero omitirlo deja una única fuente de verdad (el DEFAULT) y evita
 * que un futuro cambio de esquema quede desincronizado con el código.
 */
export async function crearPostulacion(
  input: Pick<PostulacionInsert, 'company_email' | 'job_language'>,
): Promise<PostulacionRow> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({ company_email: input.company_email, job_language: input.job_language })
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo insertar la postulación: ${error.message}`);
  }

  return data;
}

/**
 * 2) Postulaciones pendientes de entrega.
 *
 * Filtro `.eq('entregado', false)`: filas donde `entregado` es exactamente
 * `false` (lo que garantiza el `NOT NULL DEFAULT false` de la columna).
 *
 * Se ordena por `created_at` para respetar el orden de llegada y se limita el
 * lote para que una ejecución del cron tenga un coste acotado.
 */
export async function obtenerPendientes(limit: number): Promise<PostulacionRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('entregado', false)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`No se pudieron leer las postulaciones pendientes: ${error.message}`);
  }

  return data ?? [];
}

/**
 * 3) Marca una postulación como entregada.
 *
 * `entregado = true` y `entregado_at` con la marca de tiempo actual en una sola
 * sentencia. El valor es un ISO-8601 en UTC generado por Node; si prefieres que
 * lo selle PostgreSQL, usa la función RPC de `sql/postulaciones.sql`
 * (`select marcar_postulacion_entregada($1)`), que aplica `now()` en el servidor.
 *
 * `.eq('entregado', false)` añade idempotencia: si dos ejecuciones del cron se
 * solapan, solo la primera actualiza la fila; la segunda no encuentra nada y
 * `single()` devuelve un error que `marcarEntregada` traduce a `null`.
 */
export async function marcarEntregada(id: string): Promise<PostulacionRow | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ entregado: true, entregado_at: new Date().toISOString() })
    .eq('id', id)
    .eq('entregado', false)
    .select()
    .single();

  if (error) {
    // PGRST116 = "0 rows" tras `.single()`: la fila ya había sido entregada.
    if (error.code === 'PGRST116') return null;
    throw new Error(`No se pudo marcar la postulación ${id} como entregada: ${error.message}`);
  }

  return data;
}
