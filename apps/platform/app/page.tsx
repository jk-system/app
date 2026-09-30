export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-8 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        JK System — Plataforma
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Base do produto multi-tenant. Cada salao (tenant) opera aqui com seus
        proprios dados, isolados por Row Level Security.
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Proximo passo: tela de login e onboarding do tenant.
      </p>
    </div>
  );
}
