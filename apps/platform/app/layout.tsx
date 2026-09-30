import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JK System — Plataforma",
  description: "Plataforma multi-tenant de gestao para saloes de beleza.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
