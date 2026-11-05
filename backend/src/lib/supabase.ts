import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type { Database } from '../types/database.js';

export type DbClient = SupabaseClient<Database>;

let client: DbClient | null = null;

/**
 * Cliente Supabase con Service Role Key.
 *
 * La Service Role Key se salta RLS: es obligatoria para que el cron pueda leer
 * las postulaciones pendientes y marcarlas como entregadas aunque la política
 * RLS solo permita INSERT al rol anónimo.
 *
 * `autoRefreshToken` y `persistSession` se desactivan porque el backend es un
 * proceso de servidor sin sesión de usuario.
 */
export function getSupabase(): DbClient {
  if (client) return client;

  client = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
