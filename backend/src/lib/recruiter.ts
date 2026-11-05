import { env } from '../config/env.js';
import type { PostulacionRow } from '../types/database.js';

/**
 * Envía una postulación al endpoint del reclutador.
 *
 * Lanza si la respuesta no es 2xx: el cron solo marca `entregado = true` cuando
 * esta promesa se resuelve, de modo que un fallo de red deja la fila pendiente
 * para el siguiente ciclo en lugar de perderla.
 */
export async function enviarAlReclutador(postulacion: PostulacionRow): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.recruiterToken) {
    headers.Authorization = `Bearer ${env.recruiterToken}`;
  }

  const response = await fetch(env.recruiterEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: postulacion.id,
      companyEmail: postulacion.company_email,
      jobLanguage: postulacion.job_language,
      createdAt: postulacion.created_at,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    throw new Error(
      `El reclutador respondió ${response.status} ${response.statusText}${
        detalle ? `: ${detalle.slice(0, 200)}` : ''
      }`,
    );
  }
}
