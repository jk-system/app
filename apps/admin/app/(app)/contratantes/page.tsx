import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, tenantStatusTone, tenantStatusLabel } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function ContratantesPage() {
  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, status, created_at, tenant_modules(enabled), user_tenants(user_id)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Contratantes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Empresas/salões que contratam a plataforma JK System.
          </p>
        </div>
        <Link
          href="/contratantes/novo"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          + Novo contratante
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar contratantes: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Identificador</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Módulos ativos</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Usuários</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(tenants ?? []).map((tenant) => {
              const modulesEnabled = (tenant.tenant_modules ?? []).filter(
                (m: { enabled: boolean }) => m.enabled
              ).length;
              const usersCount = (tenant.user_tenants ?? []).length;
              return (
                <tr key={tenant.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contratantes/${tenant.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tenantStatusTone(tenant.status)}>
                      {tenantStatusLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {modulesEnabled === 0 ? (
                      <span className="text-amber-600">Nenhum</span>
                    ) : (
                      modulesEnabled
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {usersCount === 0 ? (
                      <span className="text-red-600">Nenhum</span>
                    ) : (
                      usersCount
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
            {(tenants ?? []).length === 0 && !error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Nenhum contratante cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
