const TONE_CLASSES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function tenantStatusTone(status: string): BadgeTone {
  if (status === "active") return "green";
  if (status === "suspended") return "amber";
  return "red";
}

export function tenantStatusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "suspended") return "Suspenso";
  return "Cancelado";
}

export function healthStatusTone(status: string): BadgeTone {
  if (status === "ok") return "green";
  if (status === "warning") return "amber";
  return "red";
}

export function healthStatusLabel(status: string): string {
  if (status === "ok") return "OK";
  if (status === "warning") return "Atenção";
  return "Crítico";
}

export function severityTone(severity: string): BadgeTone {
  if (severity === "info") return "blue";
  if (severity === "warning") return "amber";
  return "red";
}

export function severityLabel(severity: string): string {
  if (severity === "info") return "Info";
  if (severity === "warning") return "Atenção";
  if (severity === "error") return "Erro";
  return "Crítico";
}

export function subscriptionStatusTone(status: string): BadgeTone {
  if (status === "active") return "green";
  if (status === "past_due") return "amber";
  return "red";
}

export function subscriptionStatusLabel(status: string): string {
  if (status === "active") return "Em dia";
  if (status === "past_due") return "Atrasada";
  return "Cancelada";
}
