import { NavLink, Outlet } from "react-router-dom";

import { useLogout, useSessionUser } from "../features/auth/auth";
import { cx } from "../lib/cx";
import { Button } from "./ui";

const navigationItems = [
  { to: "/", label: "Inicio", icon: "⌂" },
  { to: "/visits", label: "Visitas", icon: "◌" },
  { to: "/products", label: "Produtos", icon: "◫" },
  { to: "/clients", label: "Clientes", icon: "◎" }
];

export function MobileShell() {
  const user = useSessionUser();
  const logoutMutation = useLogout();

  return (
    <div className="app-grid min-h-screen px-3 py-3 text-[var(--jam-ink)]">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[460px] flex-col rounded-[36px] border border-[var(--jam-border)] bg-[rgba(255,251,245,0.76)] shadow-[0_30px_80px_rgba(120,53,15,0.1)] backdrop-blur-sm">
        <header className="border-b border-[var(--jam-border)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-bold">Jamval</p>
              <p className="text-sm text-[var(--jam-subtle)]">Operacao de consignado no celular</p>
            </div>
            <Button
              variant="ghost"
              className="px-0 text-xs"
              onClick={() => {
                void logoutMutation.mutateAsync();
              }}
              disabled={logoutMutation.isPending}
            >
              Sair
            </Button>
          </div>
          <div className="mt-4 rounded-3xl bg-[linear-gradient(135deg,#2f1b0d_0%,#7c3f12_100%)] p-4 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Sessao ativa</p>
            <p className="mt-1 font-display text-xl font-bold">{user?.name}</p>
            <p className="text-sm text-amber-100/80">{user?.email}</p>
          </div>
        </header>

        <main className="page-fade flex-1 px-4 py-5">
          <Outlet />
        </main>

        <nav className="sticky bottom-0 grid grid-cols-4 gap-2 border-t border-[var(--jam-border)] bg-[rgba(255,248,241,0.96)] px-3 py-3">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cx(
                  "flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold transition",
                  isActive ? "bg-[rgba(190,93,25,0.14)] text-[var(--jam-ink)]" : "text-[var(--jam-subtle)]"
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
