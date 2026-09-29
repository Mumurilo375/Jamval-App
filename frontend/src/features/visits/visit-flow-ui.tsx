import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { cx } from "../../lib/cx";
import type { VisitDetail } from "../../types/domain";

export const paymentMethods = ["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export const formatPaymentMethod = (method: (typeof paymentMethods)[number]) => ({
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro"
})[method];

export function handleVisitMutationSuccess(queryClient: QueryClient) {
  return async (visit: VisitDetail) => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["visits", "operational-queue"] });
    queryClient.setQueryData(["visit", visit.id], visit);
  };
}

export function StepHeader({ step, title, subtitle, action }: {
  step: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">{step}</p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}
    </div>
    {action ? <div className="w-full sm:w-auto sm:shrink-0">{action}</div> : null}
  </div>;
}

export function MetricCell({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return <div className={cx("rounded-xl p-3", emphasize ? "bg-[rgba(29,78,216,0.08)]" : "bg-white")}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
    <p className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">{value}</p>
  </div>;
}

export function ColumnLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]", className)}>{children}</p>;
}

export function DataCell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)] sm:hidden">{label}</p>
    {children}
  </div>;
}

export function ReadonlyValue({ value, emphasize = false }: { value: string; emphasize?: boolean }) {
  return <div className={cx(
    "flex min-h-10 items-center rounded-xl border border-[var(--jam-border)] px-3 text-right text-sm font-medium text-[var(--jam-ink)]",
    emphasize ? "bg-[var(--jam-panel-strong)]" : "bg-white"
  )}><span className="w-full truncate">{value}</span></div>;
}
