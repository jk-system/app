"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function runHealthChecksNow() {
  const { error } = await supabaseAdmin.rpc("run_health_checks");

  if (error) {
    throw new Error(`Erro ao rodar verificação: ${error.message}`);
  }

  revalidatePath("/monitoramento");
  revalidatePath("/");
}
