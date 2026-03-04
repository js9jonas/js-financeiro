"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarClock, PlusCircle, Wallet, History } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/pagamentos",  label: "Pagamentos",  icon: CalendarClock },
  { href: "/historico",   label: "Histórico",   icon: History },
  { href: "/contas",      label: "Contas",      icon: Wallet },
  { href: "/lancamento",  label: "Lançar",      icon: PlusCircle },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside
      className="w-56 flex flex-col gap-1 py-6 px-3 shrink-0 border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="px-3 mb-6">
        <span className="text-lg font-bold" style={{ color: "var(--text)" }}>JS</span>
        <span className="text-lg font-bold" style={{ color: "#0ea5e9" }}> Financeiro</span>
      </div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors")}
          style={
            path.startsWith(href)
              ? { background: "#e0f2fe", color: "#0369a1" }
              : { color: "var(--text-muted)" }
          }
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </aside>
  );
}