"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { verifyAdminCpf } from "./actions";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (cpf.replace(/\D/g, "").length !== 11) {
      setError("Informe um CPF válido (11 dígitos).");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    const cpfCheck = await verifyAdminCpf(cpf);

    if (!cpfCheck.ok) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(cpfCheck.message ?? "Não foi possível confirmar seu CPF.");
      return;
    }

    const next = searchParams.get("next") ?? "/";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/jk-logo.webp"
            alt="JK System"
            width={160}
            height={160}
            priority
            className="mb-2 drop-shadow-[0_0_30px_rgba(47,127,255,0.35)]"
          />
          <h1 className="text-xl font-semibold tracking-wide text-white">
            Central JK
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Administração interna — JK System
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/40"
        >
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              placeholder="voce@jksystem.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="cpf" className="mb-1 block text-sm font-medium text-slate-300">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              required
              autoComplete="off"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              placeholder="000.000.000-00"
              maxLength={14}
            />
            <p className="mt-1 text-xs text-slate-500">
              Confirmação extra de identidade, além de e-mail e senha.
            </p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Acesso restrito à equipe JK System.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
