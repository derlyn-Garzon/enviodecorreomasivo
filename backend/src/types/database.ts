/**
 * Tipos de la base de datos.
 *
 * `postulaciones` refleja el esquema real de Supabase. Los campos de control de
 * entrega (`entregado`, `entregado_at`) los gestiona la base de datos: al insertar
 * no se envían y el DEFAULT false se aplica solo.
 */
export interface Database {
  public: {
    Tables: {
      postulaciones: {
        Row: {
          id: string;
          company_email: string;
          job_language: string;
          entregado: boolean;
          entregado_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_email: string;
          job_language: string;
          // Opcionales: la BD aplica DEFAULT false / NULL.
          entregado?: boolean;
          entregado_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_email?: string;
          job_language?: string;
          entregado?: boolean;
          entregado_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PostulacionRow = Database['public']['Tables']['postulaciones']['Row'];
export type PostulacionInsert = Database['public']['Tables']['postulaciones']['Insert'];
export type PostulacionUpdate = Database['public']['Tables']['postulaciones']['Update'];
