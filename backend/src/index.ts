import { ejecutarEntregaPendientes } from './jobs/enviarPendientes.js';

const INTERVALO_MS = 60_000;

let enEjecucion = false;

async function tick(): Promise<void> {
  // Evita solapar dos ejecuciones si una tarda más que el intervalo.
  if (enEjecucion) return;
  enEjecucion = true;

  try {
    const resumen = await ejecutarEntregaPendientes();
    if (resumen.procesadas > 0) {
      console.log(
        `[cron] procesadas=${resumen.procesadas} entregadas=${resumen.entregadas} fallidas=${resumen.fallidas}`,
      );
    }
  } catch (error) {
    console.error('[cron] Error en la ejecución:', error);
  } finally {
    enEjecucion = false;
  }
}

console.log(`[cron] Iniciado. Intervalo: ${INTERVALO_MS / 1000}s.`);
void tick();
setInterval(() => void tick(), INTERVALO_MS);
