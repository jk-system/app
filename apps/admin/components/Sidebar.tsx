"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Visão geral", icon: "◆" },
  { href: "/contratantes", label: "Contratantes", icon: "🏢" },
  { href: "/planos", label: "Planos", icon: "💳" },
  { href: "/modulos", label: "Módulos", icon: "🧩" },
  { href: "/monitoramento", label: "Monitoramento", icon: "🩺" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
        <Image
          src="/jk-mark.png"
          alt=""
          aria-hidden
          width={28}
          height={28}
          className="rounded-md"
        />
        <div className="leading-tight">
          <span className="block text-sm font-semibold tracking-wide text-white">
            JK SYSTEM
          </span>
          <span className="block text-[11px] text-brand-400">Central Admin</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-600">
        TECNOLOGIA · GESTÃO · RESULTADOS
      </div>
    </aside>
  );
}
