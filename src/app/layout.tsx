import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/financeiro/Sidebar";
import { auth } from "@/auth";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "JS Financeiro",
  description: "Controle financeiro pessoal",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={session ? "flex h-screen overflow-hidden" : "min-h-screen"}
        style={{ background: "var(--bg)" }}
        suppressHydrationWarning
      >
        {session && (
          <Suspense fallback={<div style={{ width: "224px", background: "var(--surface)" }} />}>
            <Sidebar />
          </Suspense>
        )}
        <main className={session ? "flex-1 overflow-y-auto p-6" : "w-full"}>
          {children}
        </main>
      </body>
    </html>
  );
}