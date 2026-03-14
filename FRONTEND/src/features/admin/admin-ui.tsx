import type { ReactNode } from "react";

import { Button, Card, EmptyState, ToneBadge } from "../../components/ui";
import { cx } from "../../lib/cx";
import { ApiError } from "../../lib/api";

export function AdminMetricCard({
  label,
  value,
  hint,
  tone = "neutral"
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <Card className="space-y-1.5 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
        {tone !== "neutral" ? <ToneBadge label={tone === "warning" ? "Atencao" : "Ok"} tone={tone === "warning" ? "warning" : "success"} /> : null}
      </div>
      <p className="font-display text-[1.05rem] font-semibold leading-none text-[var(--jam-ink)] sm:text-[1.35rem]">{value}</p>
      {hint ? <p className="text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{hint}</p> : null}
    </Card>
  );
}

export function AdminSectionCard({
  eyebrow,
  title,
  description,
  action,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-3 p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{eyebrow}</p> : null}
          <h2 className="text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">{title}</h2>
          {description ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{description}</p> : null}
        </div>
        {action ? <div className="w-full sm:w-auto sm:shrink-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function AdminInfoPanel({
  title,
  tone = "neutral",
  children
}: {
  title: string;
  tone?: "neutral" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border px-3 py-3 sm:px-3.5",
        tone === "warning"
          ? "border-[rgba(180,83,9,0.18)] bg-[rgba(180,83,9,0.07)]"
          : "border-[var(--jam-border)] bg-[var(--jam-panel-strong)]"
      )}
    >
      <p className="text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{title}</p>
      <div className="mt-2 space-y-2 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{children}</div>
    </div>
  );
}

export function AdminListRow({
  title,
  subtitle,
  value,
  badge
}: {
  title: string;
  subtitle?: string;
  value: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{title}</p>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{subtitle}</p> : null}
        </div>
        <p className="text-left text-[13px] font-semibold text-[var(--jam-ink)] sm:text-right sm:text-sm">{value}</p>
      </div>
    </div>
  );
}

export function AdminBarRow({
  title,
  subtitle,
  value,
  progress
}: {
  title: string;
  subtitle?: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{title}</p>
          {subtitle ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{subtitle}</p> : null}
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
        <div
          className="h-full rounded-full bg-[var(--jam-accent)] transition-[width]"
          style={{ width: `${Math.max(6, Math.min(progress, 100))}%` }}
        />
      </div>
    </div>
  );
}

export function AdminEmptyBlock({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3.5 sm:px-3.5 sm:py-4">
      <p className="text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{message}</p>
    </div>
  );
}

export function AdminQueryErrorState({
  title,
  error,
  onRetry
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  const details = getAdminErrorCopy(error);

  return (
    <EmptyState
      title={title}
      message={details.message}
      action={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={onRetry} className="w-full sm:w-auto">
            Tentar novamente
          </Button>
          {details.secondaryAction}
        </div>
      }
    />
  );
}

function getAdminErrorCopy(error: unknown): {
  message: string;
  secondaryAction?: ReactNode;
} {
  if (error instanceof ApiError) {
    const detailSuffix = extractApiErrorDetail(error.details);

    if (error.status === 401) {
      return {
        message: "Sua sessao nao foi aceita para consultar a Administracao. Entre novamente e tente abrir a pagina outra vez."
      };
    }

    if (error.status === 0) {
      return {
        message: "Nao foi possivel alcancar o backend agora. Confira se a API do Jamval esta rodando e tente novamente."
      };
    }

    if (error.status >= 500) {
      return {
        message: `O backend respondeu com erro interno ao carregar esta area administrativa. Detalhe atual: ${detailSuffix ?? error.message}.`
      };
    }

    return {
      message: `Nao foi possivel carregar esta area administrativa. Detalhe atual: ${detailSuffix ?? error.message}.`
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: `Nao foi possivel carregar esta area administrativa. Detalhe atual: ${error.message}.`
    };
  }

  return {
    message: "Nao foi possivel carregar esta area administrativa no momento. Tente novamente em alguns instantes."
  };
}

function extractApiErrorDetail(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const detailRecord = details as Record<string, unknown>;

  if (typeof detailRecord.message === "string" && detailRecord.message.trim().length > 0) {
    return detailRecord.message;
  }

  if (typeof detailRecord.name === "string" && detailRecord.name.trim().length > 0) {
    return detailRecord.name;
  }

  return null;
}
