import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppShell } from "@/components/AppShell";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Layout do grupo de rotas protegidas da Central Admin.
 *
 * 1. Confirma que existe uma sessao Supabase valida (o middleware ja deveria
 *    ter redirecionado para /login se nao houvesse, isso e defesa em profundidade).
 * 2. Confirma que o usuario esta cadastrado em jk_admins — nem todo usuario
 *    autenticado no projeto Supabase e um admin da JK (um usuario de um tenant
 *    da Plataforma tambem tem conta no mesmo projeto). So quem esta em
 *    jk_admins pode ver qualquer tela daqui pra baixo.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } = await supabaseAdmin
    .from("jk_admins")
    .select("user_id, full_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Acesso não liberado</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sua conta ({user.email}) está autenticada, mas ainda não tem acesso à Central
            Admin. Peça para um administrador da JK System te adicionar na tabela{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">jk_admins</code>.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return <AppShell userEmail={user.email ?? admin.full_name ?? "—"}>{children}</AppShell>;
}
