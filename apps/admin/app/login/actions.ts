"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { onlyDigits } from "@jk-system/database";

/**
 * Segunda checagem de identidade no login da Central Admin: além de e-mail+senha
 * (Supabase Auth), o CPF digitado precisa bater com o cadastrado em jk_admins
 * para o usuário que acabou de autenticar.
 *
 * Roda DEPOIS de supabase.auth.signInWithPassword() no client — por isso lê o
 * usuário autenticado a partir da sessão (cookies), em vez de receber o user_id
 * do client (não dá pra confiar em um user_id enviado pelo client sem validação).
 *
 * Se o CPF não bater, o client é responsável por chamar supabase.auth.signOut()
 * — este action só informa se está ok ou não.
 */
export async function verifyAdminCpf(
  cpfInput: string
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão inválida. Tente fazer login novamente." };
  }

  const cpf = onlyDigits(cpfInput);

  const { data: admin } = await supabaseAdmin
    .from("jk_admins")
    .select("cpf")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    // Sem registro em jk_admins: app/(app)/layout.tsx já trata essa tela
    // ("Acesso não liberado"), então deixa passar — não é erro de CPF.
    return { ok: true };
  }

  if (admin.cpf !== cpf) {
    return { ok: false, message: "CPF não confere com o cadastrado para este e-mail." };
  }

  return { ok: true };
}
