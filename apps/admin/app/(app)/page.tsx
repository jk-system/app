import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, healthStatusTone, healthStatusLabel } from "@/components/Badge";
import { isoHoursAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const since24h = isoHoursAgo(24);

  const [{ data: tenants }, { data: recentIssues }] = await Promise.all([
    supabaseAdmin.from("tenants").select("id, status"),
    supabaseAdmin
      .from("health_checks")
      .select("*, tenants(name)")
      .neq("status", "ok")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const counts = { active: 0, suspended: 0, cancelled: 0 };
  for (const t of tenants ?? []) {
    counts[t.status as "active" | "suspended" | "cancelled"] += 1;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Visão geral</h2>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contratantes ativos" value={counts.active} href="/contratantes" tone="green" />
        <StatCard label="Suspensos" value={counts.suspended} href="/contratantes" tone="amber" />
        <StatCard label="Cancelados" value={counts.cancelled} href="/contratantes" tone="red" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Alertas das últimas 24 horas
          </h3>
          <Link href="/monitoramento" className="text-sm text-indigo-600 hover:text-indigo-700">
            Ver monitoramento completo →
        </Link>
      </div>

        {(recentIssues ?? []).length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Nenhum alerta nas últimas 24 horas. Tudo funcionando normalmente.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(recentIssues ?? []).map((issue) => (
              <li key={issue.id} className="flex items-start gap-3 py-2.5 text-sm">
                <Badge tone={healthStatusTone(issue.status)}>
                  {healthStatusLabel(issue.status)}
                </Badge>
                <div>
                  <p className="text-slate-700">{issue.message}</p>
                  <p className="text-xs text-slate-400">
                    {(issue as unknown as { tenants?: { name: string } | null }).tenants?.name ??
                      "—"}{" "}
                    · {new Date(issue.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink href="/contratantes/novo" label="+ Novo contratante" />
        <QuickLink href="/planos" label="Gerenciar planos" />
        <QuickLink href="/modulos" label="Gerenciar módulos" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "green" | "amber" | "red";
}) {
  const toneClasses = {
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  }[tone];

  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${toneClasses}`}>{value}</p>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
    >
      {label}
    </Link>
  );
}
