"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logSystemEvent } from "@jk-system/database";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTenant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    throw new Error("Nome do contratante é obrigatório.");
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um contratante com o identificador "${slug}".`);
    }
    throw new Error(`Erro ao criar contratante: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "info",
    source: "central_admin",
    message: `Contratante "${name}" criado.`,
    tenantId: data.id,
    metadata: { slug },
  });

  revalidatePath("/contratantes");
  redirect(`/contratantes/${data.id}`);
}

export async function updateTenant(tenantId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim());

  if (!name || !slug) {
    throw new Error("Nome e identificador são obrigatórios.");
  }

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ name, slug, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) {
    throw new Error(`Erro ao atualizar contratante: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "info",
    source: "central_admin",
    message: `Contratante "${name}" atualizado.`,
    tenantId,
  });

  revalidatePath("/contratantes");
  revalidatePath(`/contratantes/${tenantId}`);
  redirect(`/contratantes/${tenantId}`);
}

export async function setTenantStatus(tenantId: string, status: "active" | "suspended" | "cancelled") {
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select("name")
    .single();

  if (error) {
    throw new Error(`Erro ao alterar status: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: status === "active" ? "info" : "warning",
    source: "central_admin",
    message: `Status do contratante "${tenant.name}" alterado para "${status}".`,
    tenantId,
    metadata: { new_status: status },
  });

  revalidatePath("/contratantes");
  revalidatePath(`/contratantes/${tenantId}`);
}

export async function toggleTenantModule(tenantId: string, moduleId: string, enabled: boolean) {
  const { error } = await supabaseAdmin
    .from("tenant_modules")
    .upsert(
      { tenant_id: tenantId, module_id: moduleId, enabled, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,module_id" }
    );

  if (error) {
    throw new Error(`Erro ao atualizar módulo: ${error.message}`);
  }

  revalidatePath(`/contratantes/${tenantId}`);
}

export async function setTenantSubscription(tenantId: string, formData: FormData) {
  const planId = String(formData.get("plan_id") ?? "");
  const status = String(formData.get("status") ?? "active") as "active" | "past_due" | "cancelled";
  const currentPeriodEndRaw = String(formData.get("current_period_end") ?? "").trim();
  const currentPeriodEnd = currentPeriodEndRaw ? new Date(currentPeriodEndRaw).toISOString() : null;

  if (!planId) {
    throw new Error("Selecione um plano.");
  }

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    tenant_id: tenantId,
    plan_id: planId,
    status,
    current_period_end: currentPeriodEnd,
  };

  const { error } = existing
    ? await supabaseAdmin.from("subscriptions").update(payload).eq("id", existing.id)
    : await supabaseAdmin.from("subscriptions").insert(payload);

  if (error) {
    throw new Error(`Erro ao salvar assinatura: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "info",
    source: "central_admin",
    message: `Assinatura do contratante atualizada (plano/${status}).`,
    tenantId,
  });

  revalidatePath(`/contratantes/${tenantId}`);
}

/**
 * Gera um novo segredo de integração externa (tenants.integration_secret) e
 * invalida o anterior. Usado quando o contratante opera um sistema próprio
 * (ex.: o sistema atual da Guitart) que consulta GET /api/integracao/status e
 * envia POST /api/integracao/heartbeat autenticado por esse segredo — ver
 * migration 0004_tenant_integration_api.sql para o desenho completo.
 */
export async function regenerateIntegrationSecret(tenantId: string) {
  const secret = crypto.randomBytes(24).toString("hex");

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .update({ integration_secret: secret, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select("name")
    .single();

  if (error) {
    throw new Error(`Erro ao gerar novo segredo de integração: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "warning",
    source: "central_admin",
    message: `Segredo de integração do contratante "${tenant.name}" foi regenerado — a integração externa antiga para de funcionar até o sistema do contratante ser atualizado com o novo valor.`,
    tenantId,
  });

  revalidatePath(`/contratantes/${tenantId}`);
}
