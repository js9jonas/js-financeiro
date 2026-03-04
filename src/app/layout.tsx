import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/financeiro/Sidebar";

export const metadata: Metadata = {
  title: "JS Financeiro",
  description: "Controle financeiro pessoal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }} suppressHydrationWarning>
        <Suspense fallback={<div style={{ width: "224px", background: "var(--surface)" }} />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}