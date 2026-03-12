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
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-subtle)]">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-[var(--jam-ink)]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
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
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName,
        className
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "min-h-11 w-full rounded-xl border border-[var(--jam-border)] bg-white px-3.5 text-sm text-[var(--jam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)]",
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
        "min-h-11 w-full rounded-xl border border-[var(--jam-border)] bg-white px-3.5 text-sm text-[var(--jam-ink)] outline-none transition focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)]",
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
        "min-h-24 w-full rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)]",
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
        "flex items-start gap-3 rounded-xl border border-[var(--jam-border)] bg-white p-3 text-sm text-[var(--jam-ink)]",
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
      <span className="block text-sm font-medium text-[var(--jam-ink)]">{label}</span>
      {hint ? <span className="block text-xs text-[var(--jam-subtle)]">{hint}</span> : null}
      {children}
      {error ? <p className="text-xs font-medium text-[var(--jam-danger)]">{error}</p> : null}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="rounded-xl border border-[rgba(180,35,24,0.14)] bg-[rgba(180,35,24,0.06)] px-3.5 py-3 text-sm font-medium text-[var(--jam-danger)]">{message}</p>;
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
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--jam-ink)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}
      </div>
      {action}
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
    <div className={cx("flex items-center justify-between gap-3 rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3", className)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--jam-ink)]">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-[var(--jam-subtle)]">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
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
