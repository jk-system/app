import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { updateTenant } from "../../actions";

export default async function EditarContratantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", id).maybeSingle();

  if (!tenant) {
    notFound();
  }

  const updateTenantWithId = updateTenant.bind(null, tenant.id);

  return (
    <div className="max-w-lg">
      <Link href={`/contratantes/${tenant.id}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← {tenant.name}
      </Link>
      <h2 className="mt-2 mb-6 text-xl font-semibold text-slate-900">Editar contratante</h2>

      <form action={updateTenantWithId} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Nome do contratante
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={tenant.name}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
            Identificador (slug)
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={tenant.slug}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
