import { NavLink, Outlet } from "react-router-dom";

import { useSessionUser } from "../features/auth/auth";
import { cx } from "../lib/cx";

const navigationItems = [
  { to: "/", label: "Operacao", icon: "◎" },
  { to: "/pendencias", label: "Pendencias", icon: "◔" },
  { to: "/cadastros", label: "Cadastros", icon: "▤" },
  { to: "/mais", label: "Mais", icon: "⋯" }
];

export function MobileShell() {
  const user = useSessionUser();
  const firstName = user?.name.split(" ")[0] ?? "Admin";

  return (
    <div className="min-h-screen bg-[var(--jam-bg)] text-[var(--jam-ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--jam-border)] bg-[rgba(243,246,249,0.96)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Jamval</p>
            <p className="font-display text-lg font-semibold text-[var(--jam-ink)]">Operacao de campo</p>
          </div>
          <div className="rounded-full border border-[var(--jam-border)] bg-white px-3 py-2 text-right">
            <p className="text-sm font-medium text-[var(--jam-ink)]">{firstName}</p>
            <p className="text-[11px] text-[var(--jam-subtle)]">Sessao ativa</p>
          </div>
        </div>
      </header>

      <main className="page-fade mx-auto w-full max-w-[460px] px-4 py-4 pb-24">
          <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--jam-border)] bg-[rgba(255,255,255,0.98)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-[460px] grid-cols-4 gap-1 px-2 py-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cx(
                  "flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition",
                  isActive ? "bg-[var(--jam-accent-soft)] text-[var(--jam-accent)]" : "text-[var(--jam-subtle)]"
                )
              }
            >
              <span className="text-sm leading-none">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
