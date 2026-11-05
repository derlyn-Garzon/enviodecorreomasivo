import { env } from '../config/env.js';
import { enviarAlReclutador } from '../lib/recruiter.js';
import {
  marcarEntregada,
  obtenerPendientes,
} from '../services/postulaciones.service.js';

export interface ResumenCron {
  procesadas: number;
  entregadas: number;
  fallidas: number;
}

/**
 * Cron de entrega: lee las postulaciones con `entregado = false`, las envía al
 * reclutador y marca cada una como entregada.
 *
 * El envío de una fila nunca interrumpe el lote: un fallo se registra y se
 * continúa con las demás. La fila fallida queda pendiente para el próximo ciclo.
 */
export async function ejecutarEntregaPendientes(): Promise<ResumenCron> {
  const pendientes = await obtenerPendientes(env.cronBatchSize);
  const resumen: ResumenCron = { procesadas: pendientes.length, entregadas: 0, fallidas: 0 };

  for (const postulacion of pendientes) {
    try {
      await enviarAlReclutador(postulacion);
      const actualizada = await marcarEntregada(postulacion.id);

      if (actualizada) {
        resumen.entregadas += 1;
      } else {
        // Otra ejecución la marcó entre la lectura y la actualización.
        console.warn(`[cron] La postulación ${postulacion.id} ya estaba entregada; se omite.`);
      }
    } catch (error) {
      resumen.fallidas += 1;
      const mensaje = error instanceof Error ? error.message : String(error);
      console.error(`[cron] Falló la postulación ${postulacion.id}: ${mensaje}`);
    }
  }

  return resumen;
}

// Ejecución directa: `npm run cron`
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  ejecutarEntregaPendientes()
    .then((resumen) => {
      console.log(
        `[cron] Listo. procesadas=${resumen.procesadas} entregadas=${resumen.entregadas} fallidas=${resumen.fallidas}`,
      );
    })
    .catch((error: unknown) => {
      console.error('[cron] Error fatal:', error);
      process.exitCode = 1;
    });
}
