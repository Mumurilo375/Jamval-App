import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "../lib/cx";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-subtle)]">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.18rem] font-semibold leading-tight text-[var(--jam-ink)] sm:text-[1.55rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="w-full sm:w-auto sm:shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cx(
        "rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:rounded-2xl sm:p-4",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variantClassName =
    variant === "primary"
      ? "bg-[var(--jam-accent)] text-white"
      : variant === "secondary"
        ? "border border-[var(--jam-border)] bg-white text-[var(--jam-ink)]"
        : variant === "danger"
          ? "bg-[rgba(180,35,24,0.08)] text-[var(--jam-danger)]"
        : "bg-transparent text-[var(--jam-subtle)]";

  return (
    <button
      className={cx(
        "inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-[12px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:px-3.5 sm:text-sm",
        variantClassName,
        className
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const isTemporalInput = props.type === "date" || props.type === "time" || props.type === "datetime-local";

  return (
    <input
      {...props}
      data-temporal-input={isTemporalInput ? "true" : undefined}
      className={cx(
        "min-h-10 w-full min-w-0 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-[13px] text-[var(--jam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:min-h-11 sm:px-3.5 sm:text-sm",
        isTemporalInput ? "pr-3 [color-scheme:light]" : null,
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "min-h-10 w-full min-w-0 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-[13px] text-[var(--jam-ink)] outline-none transition focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:min-h-11 sm:px-3.5 sm:text-sm",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-24 w-full min-w-0 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5 text-[13px] text-[var(--jam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:px-3.5 sm:py-3 sm:text-sm",
        props.className
      )}
    />
  );
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={cx(
        "flex items-start gap-3 rounded-xl border border-[var(--jam-border)] bg-white p-3 text-[13px] text-[var(--jam-ink)] sm:text-sm",
        className
      )}
    >
      <input {...props} type="checkbox" className="mt-1 h-4 w-4 accent-[var(--jam-accent)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="mt-1 block text-xs text-[var(--jam-subtle)]">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children
}: PropsWithChildren<{ label: string; hint?: string; error?: string }>) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-[var(--jam-ink)] sm:text-sm">{label}</span>
      {hint ? <span className="block text-xs text-[var(--jam-subtle)]">{hint}</span> : null}
      {children}
      {error ? <p className="text-xs font-medium text-[var(--jam-danger)]">{error}</p> : null}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="rounded-xl border border-[rgba(180,35,24,0.14)] bg-[rgba(180,35,24,0.06)] px-3.5 py-3 text-sm font-medium text-[var(--jam-danger)]">{message}</p>;
}

export function WarningBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-[rgba(180,83,9,0.18)] bg-[rgba(180,83,9,0.08)] px-3.5 py-3 text-sm font-medium text-[var(--jam-warning)]">
      {message}
    </p>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.08)] px-3.5 py-3 text-sm font-medium text-[var(--jam-success)]">
      {message}
    </p>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        active ? "bg-[rgba(15,118,110,0.1)] text-[var(--jam-success)]" : "bg-slate-100 text-slate-600"
      )}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function ToneBadge({
  label,
  tone
}: {
  label: string;
  tone: "neutral" | "warning" | "success" | "danger";
}) {
  const toneClassName =
    tone === "success"
      ? "bg-[rgba(15,118,110,0.1)] text-[var(--jam-success)]"
      : tone === "warning"
        ? "bg-[rgba(180,83,9,0.08)] text-[var(--jam-warning)]"
        : tone === "danger"
          ? "bg-[rgba(180,35,24,0.08)] text-[var(--jam-danger)]"
          : "bg-slate-100 text-slate-700";

  return <span className={cx("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClassName)}>{label}</span>;
}

export function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="w-full sm:w-auto sm:shrink-0">{action}</div> : null}
    </div>
  );
}

export function CompactLinkRow({
  title,
  subtitle,
  right,
  className
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-2 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3.5 sm:py-3",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[var(--jam-ink)] sm:text-sm">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-[12px] text-[var(--jam-subtle)] sm:text-sm">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0 self-start sm:self-auto">{right}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--jam-subtle)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function PageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-full border border-[var(--jam-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--jam-subtle)] shadow-sm">
        {label}
      </div>
    </div>
  );
}
