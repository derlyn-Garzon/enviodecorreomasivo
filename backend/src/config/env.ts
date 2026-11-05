import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`La variable ${name} debe ser un entero positivo, recibido: ${raw}`);
  }
  return parsed;
}

export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  recruiterEndpoint: required('RECRUITER_ENDPOINT'),
  recruiterToken: optional('RECRUITER_TOKEN'),
  cronBatchSize: positiveInt('CRON_BATCH_SIZE', 50),
} as const;
