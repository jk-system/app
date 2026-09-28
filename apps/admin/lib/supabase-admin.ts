import "server-only";
import { createAdminClient } from "@jk-system/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com privilegios de administrador (service_role).
 *
 * ATENCAO:
 * - Faz bypass de Row Level Security por design — usar apenas para operacoes
 *   legitimas de administracao (CRUD de tenants, planos, modulos etc).
 * - O import "server-only" garante que este arquivo nunca seja incluido
 *   acidentalmente em um bundle client-side.
 * - SUPABASE_SERVICE_ROLE_KEY nunca deve ser prefixada com NEXT_PUBLIC_.
 *
 * Instanciacao PREGUICOSA (lazy) de proposito: se o client fosse criado no
 * top-level do modulo, o `next build` falharia sempre que as env vars nao
 * estivessem presentes no momento do build (ex.: build local sem .env.local,
 * ou pipeline de CI que builda antes de configurar secrets) — mesmo em rotas
 * que sao 100% dinamicas e so leem a env var em tempo de requisicao. O Proxy
 * abaixo so chama createAdminClient() na primeira vez que alguma propriedade
 * (ex.: .from(), .auth, .rpc()) e efetivamente usada, ou seja, em tempo de
 * requisicao — quando as env vars ja devem estar configuradas no ambiente
 * de execucao (Vercel, etc.).
 */
let cachedClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );
  }
  return cachedClient;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
