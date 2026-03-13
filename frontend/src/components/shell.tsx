import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useLogout, useSessionUser } from "../features/auth/auth";
import { cx } from "../lib/cx";
import { Button } from "./ui";

type NavigationItem = {
  to: string;
  label: string;
  description: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: "Operacao",
    items: [
      {
        to: "/",
        label: "Inicio",
        description: "Centro da operacao",
        icon: <HomeIcon />,
        isActive: (pathname) => pathname === "/"
      },
      {
        to: "/visits",
        label: "Visitas",
        description: "Conferencia e acerto",
        icon: <VisitIcon />,
        isActive: (pathname) => pathname.startsWith("/visits")
      },
      {
        to: "/stock",
        label: "Estoque",
        description: "Saldo e movimentacoes",
        icon: <StockIcon />,
        isActive: (pathname) => pathname.startsWith("/stock")
      },
      {
        to: "/financeiro",
        label: "Financeiro",
        description: "Pendencias e cobranca",
        icon: <FinanceIcon />,
        isActive: (pathname) => pathname.startsWith("/financeiro") || pathname.startsWith("/pendencias")
      }
    ]
  },
  {
    title: "Cadastros",
    items: [
      {
        to: "/clients",
        label: "Clientes",
        description: "Lojas e contatos",
        icon: <ClientIcon />,
        isActive: (pathname) =>
          pathname === "/clients" ||
          pathname === "/clients/new" ||
          (/^\/clients\/[^/]+\/edit$/.test(pathname) && !pathname.includes("/catalog"))
      },
      {
        to: "/products",
        label: "Produtos",
        description: "SKUs e base comercial",
        icon: <ProductIcon />,
        isActive: (pathname) => pathname.startsWith("/products")
      },
      {
        to: "/catalog",
        label: "Catalogo por cliente",
        description: "Preco e mix por loja",
        icon: <CatalogIcon />,
        isActive: (pathname) => pathname === "/catalog" || pathname.includes("/catalog")
      }
    ]
  },
  {
    title: "Documentos",
    items: [
      {
        to: "/receipts",
        label: "Comprovantes",
        description: "Visitas concluidas",
        icon: <ReceiptIcon />,
        isActive: (pathname) => pathname.startsWith("/receipts")
      }
    ]
  },
  {
    title: "Administracao",
    items: [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        description: "Visao geral",
        icon: <DashboardIcon />,
        isActive: (pathname) => pathname.startsWith("/admin/dashboard")
      },
      {
        to: "/admin/indicadores",
        label: "Indicadores",
        description: "Metricas da operacao",
        icon: <IndicatorsIcon />,
        isActive: (pathname) => pathname.startsWith("/admin/indicadores")
      },
      {
        to: "/admin/lucro",
        label: "Lucro",
        description: "Margem e rentabilidade",
        icon: <ProfitIcon />,
        isActive: (pathname) => pathname.startsWith("/admin/lucro")
      },
      {
        to: "/admin/configuracoes",
        label: "Configuracoes",
        description: "Empresa e parametros",
        icon: <SettingsIcon />,
        isActive: (pathname) => pathname.startsWith("/admin/configuracoes")
      }
    ]
  }
];

export function AppShell() {
  const location = useLocation();
  const user = useSessionUser();
  const logoutMutation = useLogout();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const firstName = user?.name.split(" ")[0] ?? "Admin";
  const activeNavigationItem = useMemo(
    () =>
      navigationSections
        .flatMap((section) => section.items)
        .find((item) => item.isActive(location.pathname)),
    [location.pathname]
  );

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDrawerOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen]);

  return (
    <div className="min-h-screen bg-[var(--jam-bg)] text-[var(--jam-ink)]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--jam-border)] bg-[rgba(243,246,249,0.94)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--jam-border)] bg-white text-[var(--jam-ink)] md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <MenuIcon />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Jamval</p>
              <p className="truncate text-[13px] font-medium text-[var(--jam-ink)] sm:text-sm">
                {activeNavigationItem?.label ?? "Operacao do consignado"}
              </p>
            </div>
          </div>

          <div className="rounded-full border border-[var(--jam-border)] bg-white px-2.5 py-1.5 text-right sm:px-3 sm:py-2">
            <p className="text-[13px] font-medium text-[var(--jam-ink)] sm:text-sm">{firstName}</p>
            <p className="hidden text-[11px] text-[var(--jam-subtle)] sm:block">Sessao ativa</p>
          </div>
        </div>
      </header>

      <div className="md:hidden">
        <div
          className={cx(
            "fixed inset-0 z-50 bg-[rgba(15,23,42,0.36)] transition-opacity duration-200",
            isDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsDrawerOpen(false)}
        />
        <aside
          className={cx(
            "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[320px] flex-col border-r border-[var(--jam-border)] bg-[var(--jam-panel)] shadow-[0_24px_48px_rgba(15,23,42,0.18)] transition-transform duration-200",
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-hidden={!isDrawerOpen}
        >
          <NavigationPanel
            firstName={firstName}
            pathname={location.pathname}
            onLogout={() => {
              void logoutMutation.mutateAsync();
            }}
            isLoggingOut={logoutMutation.isPending}
          />
        </aside>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[var(--jam-border)] bg-[var(--jam-panel)] md:flex md:flex-col">
        <div className="h-16 shrink-0 border-b border-[var(--jam-border)]" />
        <NavigationPanel
          firstName={firstName}
          pathname={location.pathname}
          onLogout={() => {
            void logoutMutation.mutateAsync();
          }}
          isLoggingOut={logoutMutation.isPending}
        />
      </aside>

      <div className="pt-14 sm:pt-16 md:pl-72">
        <main className="page-fade mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavigationPanel({
  pathname,
  firstName,
  onLogout,
  isLoggingOut
}: {
  pathname: string;
  firstName: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <>
      <div className="border-b border-[var(--jam-border)] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Jamval</p>
        <p className="mt-2 font-display text-2xl font-semibold text-[var(--jam-ink)]">Operacao organizada</p>
        <p className="mt-1 text-sm text-[var(--jam-subtle)]">
          Navegacao preparada para crescer sem depender da barra inferior.
        </p>
        <div className="mt-4 rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3.5 py-3">
          <p className="text-sm font-medium text-[var(--jam-ink)]">{firstName}</p>
          <p className="text-sm text-[var(--jam-subtle)]">Administrador</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navigationSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = item.isActive(pathname);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cx(
                      "group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition",
                      active
                        ? "border-[rgba(29,78,216,0.16)] bg-[var(--jam-accent-soft)] text-[var(--jam-accent)]"
                        : "border-transparent text-[var(--jam-subtle)] hover:border-[var(--jam-border)] hover:bg-white hover:text-[var(--jam-ink)]"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-white text-[var(--jam-accent)]" : "bg-[var(--jam-panel-strong)] text-[var(--jam-subtle)]"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-sm opacity-80">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--jam-border)] px-4 py-4">
        <Button
          variant="ghost"
          className="w-full border border-[var(--jam-border)] bg-white"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Saindo..." : "Sair da sessao"}
        </Button>
      </div>
    </>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

function VisitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 12 4l8 4-8 4-8-4Z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 16l8 4 8-4" />
    </svg>
  );
}

function FinanceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
      <circle cx="17" cy="18" r="3" />
    </svg>
  );
}

function ClientIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-2.761 2.239-5 5-5s5 2.239 5 5" />
      <path d="M16 11c1.657 0 3 1.343 3 3" />
      <path d="M16 17h4" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h9a3 3 0 0 1 3 3v13H9a3 3 0 0 0-3 3V4Z" />
      <path d="M6 4a3 3 0 0 0-3 3v13h6" />
      <path d="M10 9h5" />
      <path d="M10 13h5" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v18l-3-2-2 2-2-2-3 2V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="11" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="17" width="7" height="3" rx="1.5" />
    </svg>
  );
}

function IndicatorsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18V10" />
      <path d="M12 18V6" />
      <path d="M19 18v-4" />
    </svg>
  );
}

function ProfitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16 10 11l3 3 6-6" />
      <path d="M19 8h-4" />
      <path d="M19 8v4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.96 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.2 16.93l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.64 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.07 3.64l.06.06A1.7 1.7 0 0 0 9 4.04a1.7 1.7 0 0 0 1-1.56V2.4a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06A2 2 0 1 1 19.8 7.07l-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}
