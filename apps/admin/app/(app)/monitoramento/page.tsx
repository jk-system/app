import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Badge,
  healthStatusTone,
  healthStatusLabel,
  severityTone,
  severityLabel,
} from "@/components/Badge";
import { runHealthChecksNow } from "./actions";
import { isoHoursAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MonitoramentoPage() {
  const since24h = isoHoursAgo(24);

  const [{ data: recentChecks }, { data: last24h }, { data: recentEvents }, tenantsById] =
    await Promise.all([
      supabaseAdmin
        .from("health_checks")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("health_checks").select("status").gte("created_at", since24h),
      supabaseAdmin
        .from("system_events")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("tenants")
        .select("id, name")
        .then(({ data }) => new Map((data ?? []).map((t) => [t.id, t.name]))),
    ]);

  const counts24h = { ok: 0, warning: 0, critical: 0 };
  for (const row of last24h ?? []) {
    counts24h[row.status as "ok" | "warning" | "critical"] += 1;
  }
  const lastRunAt = recentChecks?.[0]?.created_at ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Monitoramento</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verificações automáticas de saúde do sistema — objetivo é identificar
            problemas antes que interrompam a operação de algum contratante.
          </p>
        </div>
        <form action={runHealthChecksNow}>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Rodar verificação agora
          </button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label="OK (24h)" value={counts24h.ok} tone="green" />
        <SummaryCard label="Atenção (24h)" value={counts24h.warning} tone="amber" />
        <SummaryCard label="Crítico (24h)" value={counts24h.critical} tone="red" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Última verificação</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {lastRunAt ? new Date(lastRunAt).toLocaleString("pt-BR") : "Nunca rodou"}
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Rodando automaticamente a cada 5 minutos via pg_cron (quando habilitado no projeto
        Supabase). Verificações atuais: contratante ativo sem módulo habilitado, contratante
        ativo sem usuário vinculado, assinatura vencida ainda marcada como ativa, e
        contratante inativo há mais de 30 dias com módulos ainda habilitados. Próximo passo
        sugerido: ligar um canal de alerta (e-mail/Slack) quando algo vier como &quot;crítico&quot; —
        depende de decidir qual serviço usar.
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Verificações recentes</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Verificação</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Contratante</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Mensagem</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(recentChecks ?? []).map((check) => (
                <tr key={check.id}>
                  <td className="px-4 py-2">
                    <Badge tone={healthStatusTone(check.status)}>
                      {healthStatusLabel(check.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{check.check_key}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {(check as unknown as { tenants?: { name: string } | null }).tenants?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{check.message}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {new Date(check.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {(recentChecks ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma verificação rodou ainda. Clique em &quot;Rodar verificação agora&quot;.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Eventos do sistema</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Severidade</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Origem</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Contratante</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Mensagem</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(recentEvents ?? []).map((ev) => (
                <tr key={ev.id}>
                  <td className="px-4 py-2">
                    <Badge tone={severityTone(ev.severity)}>{severityLabel(ev.severity)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{ev.source}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {(ev as unknown as { tenants?: { name: string } | null }).tenants?.name ??
                      (ev.tenant_id ? tenantsById.get(ev.tenant_id) ?? "—" : "—")}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{ev.message}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {new Date(ev.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {(recentEvents ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum evento registrado ainda.
                </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
}) {
  const toneClasses = {
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses}`}>{value}</p>
    </div>
  );
}
