import { useEffect, useMemo, useRef, useState } from "react";
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

export function DrawerPanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md"
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: "md" | "lg";
}>) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,23,42,0.46)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Fechar painel"
      />

      <div className="absolute inset-0 flex items-end justify-end sm:items-stretch">
        <section
          className={cx(
            "relative flex h-[min(88vh,760px)] w-full flex-col rounded-t-[28px] border border-[var(--jam-border)] bg-[var(--jam-panel)] shadow-[0_24px_60px_rgba(15,23,42,0.24)] sm:h-full sm:rounded-none sm:border-b-0 sm:border-r-0 sm:border-t-0",
            size === "lg" ? "sm:max-w-[640px]" : "sm:max-w-[560px]"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--jam-border)] px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">{title}</p>
              {description ? <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-sm">{description}</p> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--jam-border)] bg-white text-[var(--jam-subtle)] transition hover:text-[var(--jam-ink)]"
              aria-label="Fechar"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

          {footer ? <div className="border-t border-[var(--jam-border)] px-4 py-3.5 sm:px-5">{footer}</div> : null}
        </section>
      </div>
    </div>
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
  return (
    <input
      {...props}
      className={cx(
        "min-h-10 w-full min-w-0 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-[13px] text-[var(--jam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:min-h-11 sm:px-3.5 sm:text-sm",
        props.className
      )}
    />
  );
}

type DateInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
};

export function DateInput({
  value,
  onValueChange,
  placeholder = "Selecionar data",
  className,
  disabled,
  min,
  max
}: DateInputProps) {
  return (
    <DateValuePicker
      mode="date"
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      min={min}
      max={max}
    />
  );
}

export function DateTimeInput({
  value,
  onValueChange,
  placeholder = "Selecionar data e hora",
  className,
  disabled,
  min,
  max
}: DateInputProps) {
  return (
    <DateValuePicker
      mode="datetime-local"
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      min={min}
      max={max}
    />
  );
}

function DateValuePicker({
  mode,
  value,
  onValueChange,
  placeholder,
  className,
  disabled,
  min,
  max
}: DateInputProps & { mode: "date" | "datetime-local" }) {
  const selectedDate = useMemo(
    () => (mode === "date" ? parseDateValue(value) : parseDateTimeLocalValue(value)),
    [mode, value]
  );
  const minDate = useMemo(
    () => (mode === "date" ? parseDateValue(min) : parseDateTimeLocalValue(min)),
    [mode, min]
  );
  const maxDate = useMemo(
    () => (mode === "date" ? parseDateValue(max) : parseDateTimeLocalValue(max)),
    [mode, max]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const base = selectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const days = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const entries: Array<{ key: string; day: number | null }> = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      entries.push({ key: `empty-${index}`, day: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      entries.push({ key: `day-${year}-${month}-${day}`, day });
    }

    return entries;
  }, [viewDate]);

  const selectedDayKey = selectedDate ? getDayKey(selectedDate) : null;

  const assignDate = (day: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day,
      mode === "datetime-local" ? base.getHours() : 0,
      mode === "datetime-local" ? base.getMinutes() : 0,
      0,
      0
    );

    if (!isWithinRange(next, minDate, maxDate, mode)) {
      return;
    }

    onValueChange(mode === "date" ? formatDateValue(next) : formatDateTimeLocalValue(next));
    setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));

    if (mode === "date") {
      setIsOpen(false);
    }
  };

  const updateTime = (nextHour: number, nextMinute: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setHours(nextHour, nextMinute, 0, 0);

    if (!isWithinRange(next, minDate, maxDate, mode)) {
      return;
    }

    onValueChange(formatDateTimeLocalValue(next));
  };

  const selectedHour = selectedDate ? String(selectedDate.getHours()).padStart(2, "0") : "00";
  const selectedMinute = selectedDate ? String(selectedDate.getMinutes()).padStart(2, "0") : "00";
  const syncViewDateWithSelection = () => {
    const base = selectedDate ?? new Date();
    setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            syncViewDateWithSelection();
          }

          setIsOpen((current) => !current);
        }}
        disabled={disabled}
        className={cx(
          "inline-flex min-h-10 w-full min-w-0 items-center justify-between rounded-xl border border-[var(--jam-border)] bg-white px-3 py-2 text-left text-base text-[var(--jam-ink)] outline-none transition focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11 sm:px-3.5 sm:text-sm",
          className
        )}
      >
        <span className={cx("truncate", !value ? "text-slate-400" : null)}>{value ? formatDateDisplay(value, mode) : placeholder}</span>
        <span className="ml-2 shrink-0 rounded-full bg-[var(--jam-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-accent)]">
          Data
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 z-50 mt-2 w-[min(92vw,360px)] max-w-[calc(100vw-1rem)] rounded-2xl border border-[var(--jam-border)] bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.2)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
                className="rounded-lg border border-[var(--jam-border)] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[var(--jam-subtle)] sm:text-[12px]"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              Mes anterior
            </button>
            <p className="text-[14px] font-semibold text-[var(--jam-ink)] sm:text-[13px]">{MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
            <button
              type="button"
              className="rounded-lg border border-[var(--jam-border)] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[var(--jam-subtle)] sm:text-[12px]"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              Proximo mes
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-subtle)]">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((entry) => {
              const dayValue = entry.day;

              if (dayValue === null) {
                return <span key={entry.key} className="h-9" />;
              }

              const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayValue, 12, 0, 0, 0);
              const isSelected = selectedDayKey === getDayKey(dayDate);
              const isToday = getDayKey(dayDate) === getDayKey(new Date());
              const isDisabled = !isWithinRange(dayDate, minDate, maxDate, "date");

              return (
                <button
                  key={entry.key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => assignDate(dayValue)}
                  className={cx(
                    "h-9 rounded-lg border text-[12px] font-semibold transition",
                    isSelected
                      ? "border-[var(--jam-accent)] bg-[var(--jam-accent)] text-white"
                      : isToday
                        ? "border-[rgba(29,78,216,0.3)] bg-[var(--jam-accent-soft)] text-[var(--jam-accent)]"
                        : "border-transparent bg-[var(--jam-panel-strong)] text-[var(--jam-ink)] hover:border-[var(--jam-border)] hover:bg-white",
                    isDisabled ? "cursor-not-allowed opacity-40" : null
                  )}
                >
                  {entry.day}
                </button>
              );
            })}
          </div>

          {mode === "datetime-local" ? (
            <div className="mt-3 space-y-2 border-t border-[var(--jam-border)] pt-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-subtle)]">Horario</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <select
                  value={selectedHour}
                  onChange={(event) => updateTime(Number(event.target.value), selectedMinute ? Number(selectedMinute) : 0)}
                  className="min-h-10 rounded-xl border border-[var(--jam-border)] bg-white px-3 text-base text-[var(--jam-ink)] outline-none transition focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:text-sm"
                >
                  {HOUR_OPTIONS.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <span className="text-[13px] font-semibold text-[var(--jam-subtle)]">:</span>
                <select
                  value={selectedMinute}
                  onChange={(event) => updateTime(selectedHour ? Number(selectedHour) : 0, Number(event.target.value))}
                  className="min-h-10 rounded-xl border border-[var(--jam-border)] bg-white px-3 text-base text-[var(--jam-ink)] outline-none transition focus:border-[rgba(29,78,216,0.45)] focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] sm:text-sm"
                >
                  {MINUTE_OPTIONS.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--jam-border)] pt-3">
            <button
              type="button"
              onClick={() => onValueChange("")}
              className="rounded-lg border border-[var(--jam-border)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--jam-subtle)]"
            >
              Limpar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  onValueChange(mode === "date" ? formatDateValue(now) : formatDateTimeLocalValue(now));
                  if (mode === "date") {
                    setIsOpen(false);
                  }
                }}
                className="rounded-lg border border-[var(--jam-border)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--jam-subtle)]"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-[var(--jam-accent)] px-2.5 py-1.5 text-[12px] font-semibold text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "itens",
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--jam-subtle)]">
        Mostrando {start}-{end} de {totalItems} {itemLabel}
      </p>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:items-center">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="min-w-[96px]"
        >
          Anterior
        </Button>

        <p className="text-center text-sm font-semibold text-[var(--jam-ink)]">
          Pagina {page} de {totalPages}
        </p>

        <Button
          type="button"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="min-w-[96px]"
        >
          Proxima
        </Button>
      </div>
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

function parseDateValue(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseDateTimeLocalValue(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTimeLocalValue(date: Date): string {
  return `${formatDateValue(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDateDisplay(value: string, mode: "date" | "datetime-local"): string {
  const date = mode === "date" ? parseDateValue(value) : parseDateTimeLocalValue(value);

  if (!date) {
    return value;
  }

  const datePart = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

  if (mode === "date") {
    return datePart;
  }

  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${datePart} ${timePart}`;
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isWithinRange(date: Date, minDate: Date | null, maxDate: Date | null, mode: "date" | "datetime-local"): boolean {
  if (mode === "date") {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
    const minDay = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0).getTime() : null;
    const maxDay = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 0, 0, 0, 0).getTime() : null;

    if (minDay !== null && dayDate < minDay) {
      return false;
    }

    if (maxDay !== null && dayDate > maxDay) {
      return false;
    }

    return true;
  }

  const stamp = date.getTime();

  if (minDate && stamp < minDate.getTime()) {
    return false;
  }

  if (maxDate && stamp > maxDate.getTime()) {
    return false;
  }

  return true;
}
