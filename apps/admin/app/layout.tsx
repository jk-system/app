import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central JK — Admin",
  description: "Administracao interna da JK System: Contratantes, planos e modulos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
