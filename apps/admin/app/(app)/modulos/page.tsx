import { supabaseAdmin } from "@/lib/supabase-admin";
import { createModule } from "./actions";

export const dynamic = "force-dynamic";

export default async function ModulosPage() {
  const { data: modules } = await supabaseAdmin
    .from("modules")
    .select("*, tenant_modules(enabled)")
    .order("name");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Módulos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo global de funcionalidades que podem ser habilitadas por contratante.
        </p>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Identificador</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Contratantes com módulo ativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(modules ?? []).map((mod) => {
              const activeCount = (mod.tenant_modules ?? []).filter(
                (tm: { enabled: boolean }) => tm.enabled
              ).length;
              return (
                <tr key={mod.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{mod.name}</td>
                  <td className="px-4 py-3 text-slate-500">{mod.key}</td>
                  <td className="px-4 py-3 text-slate-600">{mod.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{activeCount}</td>
                </tr>
              );
            })}
            {(modules ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Nenhum módulo cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Novo módulo</h3>
        <form action={createModule} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
            <input
              name="name"
              required
              placeholder="Ex.: Fidelidade"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Identificador</label>
            <input
              name="key"
              placeholder="fidelidade"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
            <input
              name="description"
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Criar módulo
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
