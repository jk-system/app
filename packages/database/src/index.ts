import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no browser / apps do lado do tenant (Plataforma).
 *
 * Usa a chave publica (publishable/anon) — segura para expor no client.
 * Todo acesso a dados passa por Row Level Security (ver packages/database/migrations).
 *
 * IMPORTANTE: usa o client de "@supabase/ssr" (nao o createClient() puro de
 * "@supabase/supabase-js") de proposito. O client puro so guarda sessao em
 * localStorage; o de "@supabase/ssr" tambem escreve a sessao em cookies, que e
 * o que middleware.ts e os Server Components (lib/supabase-server.ts) leem para
 * saber quem esta logado. Sem isso, o login "funciona" no browser mas o servidor
 * nunca ve a sessao — o middleware redireciona de volta para /login em loop.
 */
export function createBrowserClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "createBrowserClient: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY sao obrigatorios."
    );
  }
  return createSsrBrowserClient(url, anonKey);
}

/**
 * Cliente Supabase com privilegios de administrador (service_role).
 *
 * ATENCAO: este client faz bypass de RLS por design.
 * Uso EXCLUSIVO no backend da Central Admin (server-side).
 * Nunca importar este modulo em codigo que roda no browser,
 * e nunca usar a service_role key no app da Plataforma.
 */
export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios. " +
        "Este client so deve ser instanciado em codigo server-side da Central Admin."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Tipos do schema — placeholder.
 *
 * TODO: gerar tipos reais a partir do banco com:
 *   npx supabase gen types typescript --project-id dywqzrnpukwlahbnkwbu > packages/database/src/types.ts
 * e trocar este tipo por `Database` gerado, passando-o como generic para createClient<Database>().
 */
export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type UserTenantRole = "owner" | "manager" | "staff";

export type Module = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type TenantModule = {
  tenant_id: string;
  module_id: string;
  enabled: boolean;
  updated_at: string;
};

export type Plan = {
  id: string;
  key: string;
  name: string;
  price_cents: number;
  created_at: string;
};

export type SubscriptionStatus = "active" | "past_due" | "cancelled";

export type Subscription = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
};

export type JkAdminRole = "super_admin" | "admin";

export type JkAdmin = {
  user_id: string;
  full_name: string | null;
  cpf: string;
  role: JkAdminRole;
  created_at: string;
};

/** Remove tudo que não for dígito. Usado para normalizar CPF antes de comparar/gravar. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export type SystemEventSeverity = "info" | "warning" | "error" | "critical";

export type SystemEvent = {
  id: number;
  created_at: string;
  tenant_id: string | null;
  severity: SystemEventSeverity;
  source: string;
  message: string;
  metadata: Record<string, unknown>;
};

export type HealthCheckStatus = "ok" | "warning" | "critical";

export type HealthCheck = {
  id: number;
  created_at: string;
  check_key: string;
  status: HealthCheckStatus;
  tenant_id: string | null;
  message: string;
  details: Record<string, unknown>;
};

/**
 * Registra um evento no log de auditoria/monitoramento (tabela system_events).
 *
 * Uso: SEMPRE com um client que tenha privilégio de escrita nessa tabela
 * (na prática, o admin client / service_role — ver createAdminClient acima),
 * pois system_events não tem policy de RLS para anon/authenticated.
 *
 * Nunca lança exceção: falha ao logar não deve quebrar a operação principal
 * que está sendo registrada. Erros de log são só emitidos no console do server.
 */
export async function logSystemEvent(
  client: SupabaseClient,
  event: {
    severity: SystemEventSeverity;
    source: string;
    message: string;
    tenantId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await client.from("system_events").insert({
      severity: event.severity,
      source: event.source,
      message: event.message,
      tenant_id: event.tenantId ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error("logSystemEvent: falha ao gravar evento", error, event);
    }
  } catch (err) {
    console.error("logSystemEvent: excecao ao gravar evento", err, event);
  }
}
