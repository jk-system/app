import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Badge,
  tenantStatusTone,
  tenantStatusLabel,
  subscriptionStatusTone,
  subscriptionStatusLabel,
  severityTone,
  severityLabel,
} from "@/components/Badge";
import { setTenantStatus, toggleTenantModule, setTenantSubscription } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContratanteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: tenant }, { data: allModules }, { data: tenantModules }, { data: userTenants }, { data: subscriptions }, { data: plans }, { data: events }] =
    await Promise.all([
      supabaseAdmin.from("tenants").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("modules").select("*").order("name"),
      supabaseAdmin.from("tenant_modules").select("*").eq("tenant_id", id),
      supabaseAdmin.from("user_tenants").select("*").eq("tenant_id", id),
      supabaseAdmin
        .from("subscriptions")
        .select("*, plans(name, key)")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabaseAdmin.from("plans").select("*").order("price_cents"),
      supabaseAdmin
        .from("system_events")
        .select("*")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (!tenant) {
    notFound();
  }

  const enabledModuleIds = new Set(
    (tenantModules ?? []).filter((tm) => tm.enabled).map((tm) => tm.module_id)
  );

  const usersWithEmail = await Promise.all(
    (userTenants ?? []).map(async (ut) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(ut.user_id);
      return { ...ut, email: data.user?.email ?? ut.user_id };
    })
  );

  const subscription = subscriptions?.[0] as
    | (Record<string, unknown> & { plans?: { name: string; key: string } | null })
    | undefined;

  return (
    <div className="max-w-4xl">
      <Link href="/contratantes" className="text-sm text-slate-500 hover:text-slate-700">
        ← Contratantes
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{tenant.name}</h2>
            <Badge tone={tenantStatusTone(tenant.status)}>{tenantStatusLabel(tenant.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {tenant.slug} · criado em {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Link
          href={`/contratantes/${tenant.id}/editar`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Editar
        </Link>
      </div>

      {/* Status */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Status do contratante</h3>
        <div className="flex gap-2">
          <form action={setTenantStatus.bind(null, tenant.id, "active")}>
            <button
              type="submit"
              disabled={tenant.status === "active"}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ativar
            </button>
          </form>
          <form action={setTenantStatus.bind(null, tenant.id, "suspended")}>
            <button
              type="submit"
              disabled={tenant.status === "suspended"}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suspender
            </button>
          </form>
          <form action={setTenantStatus.bind(null, tenant.id, "cancelled")}>
            <button
              type="submit"
              disabled={tenant.status === "cancelled"}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
          </form>
        </div>
      </section>

      {/* Módulos */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Módulos habilitados</h3>
        <ul className="divide-y divide-slate-100">
          {(allModules ?? []).map((mod) => {
            const isEnabled = enabledModuleIds.has(mod.id);
            return (
              <li key={mod.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{mod.name}</p>
                  {mod.description ? (
                    <p className="text-xs text-slate-500">{mod.description}</p>
                  ) : null}
                </div>
                <form action={toggleTenantModule.bind(null, tenant.id, mod.id, !isEnabled)}>
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {isEnabled ? "Habilitado" : "Desabilitado"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Plano / assinatura */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Plano e assinatura</h3>
          {subscription ? (
            <Badge tone={subscriptionStatusTone(String(subscription.status))}>
              {subscriptionStatusLabel(String(subscription.status))}
            </Badge>
          ) : null}
        </div>
        <form
          action={setTenantSubscription.bind(null, tenant.id)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Plano</label>
            <select
              name="plan_id"
              defaultValue={(subscription?.plan_id as string) ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {(plans ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — R$ {(plan.price_cents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              name="status"
              defaultValue={(subscription?.status as string) ?? "active"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="active">Em dia</option>
              <option value="past_due">Atrasada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Vencimento do período
            </label>
            <input
              type="date"
              name="current_period_end"
              defaultValue={
                subscription?.current_period_end
                  ? String(subscription.current_period_end).slice(0, 10)
                  : ""
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Salvar assinatura
            </button>
          </div>
        </form>
      </section>

      {/* Usuários */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Usuários vinculados</h3>
        {usersWithEmail.length === 0 ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Nenhum usuário vinculado a este contratante ainda — ninguém consegue operar a
            plataforma até um usuário ser criado no Supabase Auth e vinculado aqui.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {usersWithEmail.map((ut) => (
              <li key={ut.user_id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-800">{ut.email}</span>
                <Badge tone="slate">{ut.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Atividade recente */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Atividade recente</h3>
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {(events ?? []).map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 text-sm">
                <Badge tone={severityTone(ev.severity)}>{severityLabel(ev.severity)}</Badge>
                <div>
                  <p className="text-slate-700">{ev.message}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(ev.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
