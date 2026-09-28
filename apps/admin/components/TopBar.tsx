"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function TopBar({ userEmail, title }: { userEmail: string; title?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title ?? ""}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{userEmail}</span>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
