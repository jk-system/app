import { createBrowserClient } from "@jk-system/database";

/**
 * Cliente Supabase da Plataforma — usa sempre a chave publica (anon).
 * Todo acesso a dados e mediado por Row Level Security (tenant_id via user_tenants).
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
