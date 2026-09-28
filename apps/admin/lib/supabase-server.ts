import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para Server Components / Server Actions da Central Admin.
 *
 * Usa a chave publica (anon) + a sessao do usuario (via cookies) — respeita RLS.
 * Serve para saber QUEM esta logado (auth.getUser()); operacoes de dado (CRUD de
 * tenants, planos, modulos, etc.) usam o supabaseAdmin (service_role) definido em
 * lib/supabase-admin.ts, ja que as tabelas de controle nao tem policy para
 * authenticated — apenas para service_role.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // chamado de um Server Component sem permissao de escrita de cookie —
            // seguro ignorar aqui, pois o middleware ja cuida de refresh de sessao.
          }
        },
      },
    }
  );
}
