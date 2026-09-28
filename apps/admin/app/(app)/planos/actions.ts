"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logSystemEvent } from "@jk-system/database";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createPlan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const priceReais = Number(formData.get("price") ?? 0);
  const key = slugify(keyInput || name);

  if (!name || !key || Number.isNaN(priceReais)) {
    throw new Error("Preencha nome e preço corretamente.");
  }

  const { error } = await supabaseAdmin.from("plans").insert({
    name,
    key,
    price_cents: Math.round(priceReais * 100),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um plano com o identificador "${key}".`);
    }
    throw new Error(`Erro ao criar plano: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "info",
    source: "central_admin",
    message: `Plano "${name}" criado.`,
  });

  revalidatePath("/planos");
}
