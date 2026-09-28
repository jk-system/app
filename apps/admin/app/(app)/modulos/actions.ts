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

export async function createModule(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const key = slugify(keyInput || name);

  if (!name || !key) {
    throw new Error("Nome do módulo é obrigatório.");
  }

  const { error } = await supabaseAdmin.from("modules").insert({ name, key, description });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um módulo com o identificador "${key}".`);
    }
    throw new Error(`Erro ao criar módulo: ${error.message}`);
  }

  await logSystemEvent(supabaseAdmin, {
    severity: "info",
    source: "central_admin",
    message: `Módulo "${name}" adicionado ao catálogo.`,
  });

  revalidatePath("/modulos");
}
