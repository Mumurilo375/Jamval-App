import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "../lib/cx";

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--jam-subtle)]">Jamval V1</p>
        <h1 className="font-display text-[1.8rem] font-bold leading-tight text-[var(--jam-ink)]">{title}</h1>
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
        "rounded-[28px] border border-[var(--jam-border)] bg-[var(--jam-panel)] p-4 shadow-[0_20px_55px_rgba(120,53,15,0.08)] backdrop-blur",
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
      ? "bg-[var(--jam-ink)] text-white shadow-[0_12px_30px_rgba(49,32,18,0.2)]"
      : variant === "secondary"
        ? "bg-[rgba(190,93,25,0.12)] text-[var(--jam-ink)]"
        : variant === "danger"
          ? "bg-[rgba(182,59,50,0.14)] text-[var(--jam-danger)]"
        : "bg-transparent text-[var(--jam-subtle)]";

  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
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
        "min-h-12 w-full rounded-2xl border border-[var(--jam-border)] bg-white/90 px-4 text-sm text-[var(--jam-ink)] outline-none transition placeholder:text-stone-400 focus:border-[rgba(190,93,25,0.45)] focus:ring-4 focus:ring-[rgba(245,158,11,0.14)]",
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
        "min-h-12 w-full rounded-2xl border border-[var(--jam-border)] bg-white/90 px-4 text-sm text-[var(--jam-ink)] outline-none transition focus:border-[rgba(190,93,25,0.45)] focus:ring-4 focus:ring-[rgba(245,158,11,0.14)]",
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
        "min-h-28 w-full rounded-2xl border border-[var(--jam-border)] bg-white/90 px-4 py-3 text-sm text-[var(--jam-ink)] outline-none transition placeholder:text-stone-400 focus:border-[rgba(190,93,25,0.45)] focus:ring-4 focus:ring-[rgba(245,158,11,0.14)]",
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
        "flex items-start gap-3 rounded-2xl border border-[var(--jam-border)] bg-white/80 p-3 text-sm text-[var(--jam-ink)]",
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
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-[var(--jam-ink)]">{label}</span>
      {hint ? <span className="block text-xs text-[var(--jam-subtle)]">{hint}</span> : null}
      {children}
      {error ? <p className="text-xs font-medium text-[var(--jam-danger)]">{error}</p> : null}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="rounded-2xl bg-[rgba(182,59,50,0.1)] px-4 py-3 text-sm font-medium text-[var(--jam-danger)]">{message}</p>;
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        active ? "bg-[rgba(34,120,87,0.12)] text-[var(--jam-success)]" : "bg-stone-200 text-stone-600"
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
      ? "bg-[rgba(34,120,87,0.12)] text-[var(--jam-success)]"
      : tone === "warning"
        ? "bg-[rgba(245,158,11,0.14)] text-[#9a5a00]"
        : tone === "danger"
          ? "bg-[rgba(182,59,50,0.1)] text-[var(--jam-danger)]"
          : "bg-stone-200 text-stone-700";

  return <span className={cx("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClassName)}>{label}</span>;
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
    <Card className="border-dashed text-center">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--jam-subtle)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function PageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-full border border-[var(--jam-border)] bg-[var(--jam-panel)] px-4 py-3 text-sm font-medium text-[var(--jam-subtle)] shadow-sm">
        {label}
      </div>
    </div>
  );
}
