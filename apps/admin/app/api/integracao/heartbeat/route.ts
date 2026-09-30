import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logSystemEvent } from "@jk-system/database";

/**
 * POST /api/integracao/heartbeat
 * Header obrigatório: X-Tenant-Secret: <integration_secret do contratante>
 * Body JSON: { slug: string, status: "ok" | "warning" | "critical", message?: string, details?: object }
 *
 * Chamado PELO sistema do próprio contratante (ex.: o sistema atual da Guitart)
 * para reportar que está no ar (status "ok") ou que encontrou um problema
 * (status "warning"/"critical"). Grava em health_checks (mesma tabela usada por
 * run_health_checks(), migration 0003) e — quando não é "ok" — também em
 * system_events, para aparecer junto dos outros alertas na tela Monitoramento.
 *
 * Não transporta nenhum dado operacional do contratante — só um sinal de saúde.
 */

const ALLOWED_STATUS = new Set(["ok", "warning", "critical"]);

function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-Secret");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-tenant-secret");

  let body: { slug?: string; status?: string; message?: string; details?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: "Corpo da requisicao deve ser JSON valido." }, { status: 400 }));
  }

  const slug = (body.slug ?? "").toString().trim();
  const status = (body.status ?? "").toString().trim();
  const message = (body.message ?? "").toString().trim() || "Heartbeat recebido.";
  const details = body.details ?? {};

  if (!slug || !secret) {
    return withCors(
      NextResponse.json(
        { error: "Campo 'slug' (no corpo) e header 'X-Tenant-Secret' sao obrigatorios." },
        { status: 400 }
      )
    );
  }

  if (!ALLOWED_STATUS.has(status)) {
    return withCors(
      NextResponse.json({ error: "Campo 'status' deve ser 'ok', 'warning' ou 'critical'." }, { status: 400 })
    );
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, name, integration_secret")
    .eq("slug", slug)
    .maybeSingle();

  if (tenantError) {
    console.error("POST /api/integracao/heartbeat: erro ao consultar tenant", tenantError);
    return withCors(NextResponse.json({ error: "Erro interno ao consultar contratante." }, { status: 500 }));
  }

  if (!tenant || tenant.integration_secret !== secret) {
    return withCors(NextResponse.json({ error: "Nao autorizado." }, { status: 401 }));
  }

  const { error: healthError } = await supabaseAdmin.from("health_checks").insert({
    check_key: `heartbeat:${slug}`,
    status,
    tenant_id: tenant.id,
    message,
    details,
  });

  if (healthError) {
    console.error("POST /api/integracao/heartbeat: erro ao gravar health_check", healthError);
    return withCors(NextResponse.json({ error: "Erro ao gravar heartbeat." }, { status: 500 }));
  }

  await supabaseAdmin
    .from("tenants")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", tenant.id);

  if (status !== "ok") {
    await logSystemEvent(supabaseAdmin, {
      severity: status === "critical" ? "critical" : "warning",
      source: "integracao_externa",
      message: `[${tenant.name}] ${message}`,
      tenantId: tenant.id,
      metadata: { check_key: `heartbeat:${slug}`, ...details },
    });
  }

  return withCors(NextResponse.json({ ok: true }));
}
