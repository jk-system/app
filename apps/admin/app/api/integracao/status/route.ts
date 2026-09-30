import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/integracao/status?slug=<slug-do-contratante>
 * Header obrigatório: X-Tenant-Secret: <integration_secret do contratante>
 *
 * Chamado PELO sistema do próprio contratante (ex.: o sistema atual da Guitart),
 * não pela Central Admin. Devolve só o status (active/suspended/cancelled) —
 * nenhum outro dado do contratante é exposto aqui.
 *
 * Uso esperado no sistema do contratante: consultar isto no início de cada
 * sessão/acesso (ou em cache curto, ex. 1-5 min) e bloquear o uso mostrando uma
 * tela de "sistema suspenso" quando a resposta não for "active".
 *
 * Mesma resposta (401) para "contratante não existe" e "segredo incorreto", de
 * propósito — não dá pista para quem estiver tentando adivinhar slugs/segredos.
 */

function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-Secret");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const secret = request.headers.get("x-tenant-secret");

  if (!slug || !secret) {
    return withCors(
      NextResponse.json(
        { error: "Parametro 'slug' (query string) e header 'X-Tenant-Secret' sao obrigatorios." },
        { status: 400 }
      )
    );
  }

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("status, integration_secret")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("GET /api/integracao/status: erro ao consultar tenant", error);
    return withCors(NextResponse.json({ error: "Erro interno ao consultar contratante." }, { status: 500 }));
  }

  if (!tenant || tenant.integration_secret !== secret) {
    return withCors(NextResponse.json({ error: "Nao autorizado." }, { status: 401 }));
  }

  return withCors(NextResponse.json({ status: tenant.status }));
}
