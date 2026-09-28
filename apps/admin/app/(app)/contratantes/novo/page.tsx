import Link from "next/link";
import { createTenant } from "../actions";

export default function NovoContratantePage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/contratantes" className="text-sm text-slate-500 hover:text-slate-700">
          ← Contratantes
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Novo contratante</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadastra um novo salão/empresa na plataforma. Depois de criado, você poderá
          habilitar módulos, definir o plano e vincular usuários.
        </p>
      </div>

      <form action={createTenant} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Nome do contratante
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="Ex.: Guitart & Co."
          />
        </div>

        <div className="mb-6">
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
            Identificador (slug)
          </label>
          <input
            id="slug"
            name="slug"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="Deixe em branco para gerar a partir do nome"
          />
          <p className="mt-1 text-xs text-slate-400">
            Usado internamente para identificar o contratante. Se deixar em branco, é
            gerado automaticamente a partir do nome.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Criar contratante
        </button>
      </form>
    </div>
  );
}
