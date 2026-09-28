import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPlan } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*, subscriptions(count)")
    .order("price_cents");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Planos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo de planos oferecidos aos contratantes.
        </p>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Identificador</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Preço</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Assinaturas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(plans ?? []).map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{plan.name}</td>
                <td className="px-4 py-3 text-slate-500">{plan.key}</td>
                <td className="px-4 py-3 text-slate-600">
                  R$ {(plan.price_cents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {(plan.subscriptions as unknown as { count: number }[])?.[0]?.count ?? 0}
                </td>
              </tr>
            ))}
            {(plans ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Nenhum plano cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Novo plano</h3>
        <form action={createPlan} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
            <input
              name="name"
              required
              placeholder="Ex.: Starter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Identificador</label>
            <input
              name="key"
              placeholder="starter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Preço (R$/mês)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Criar plano
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
