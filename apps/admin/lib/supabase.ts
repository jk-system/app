import { createBrowserClient } from "@jk-system/database";

/**
 * Cliente Supabase do lado do browser na Central Admin (login, sessao do usuario JK).
 * Usa a chave publica (anon) — nao tem privilegio de bypass de RLS.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
