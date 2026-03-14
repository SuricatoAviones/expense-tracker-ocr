"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";

type AuthUser = {
  name?: string | null;
  email?: string | null;
};

const navSections = [
  {
    label: "Principal",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard/expenses", label: "Gastos" },
      { href: "/dashboard/incomes", label: "Ingresos" },
      { href: "/dashboard/accounts", label: "Cuentas" },
      { href: "/dashboard/transfers", label: "Transferencias" },
      { href: "/dashboard/scan", label: "Escanear" },
      { href: "/dashboard/budgets", label: "Presupuestos" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/dashboard/categories", label: "Categorias" },
      { href: "/dashboard/export", label: "Exportar" },
      { href: "/dashboard/tools", label: "Herramientas" },
      { href: "/dashboard/users", label: "Usuarios" },
    ],
  },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { user?: AuthUser }) => {
        if (!mounted) return;
        setUser(data.user ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/login");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0c1018]">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials =
    user.name
      ?.split(" ")
      .map((name: string) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0c1018] text-gray-900 dark:text-gray-200">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-56 flex flex-col bg-white dark:bg-[#0f1523] border-r border-gray-200 dark:border-white/5 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200 dark:border-white/5 shrink-0">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            $
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">ExpenseTracker</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 truncate">OCR Studio</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive(item.href)
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-gray-200 dark:border-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-200 truncate">
                {user.name ?? "Usuario"}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-600 truncate">
                {user.email ?? ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesion"
              className="p-1 text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 flex items-center gap-4 px-4 md:px-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0f1523]">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">
            Panel de control
          </h1>

          <div className="ml-auto">
            <button
              onClick={toggle}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
