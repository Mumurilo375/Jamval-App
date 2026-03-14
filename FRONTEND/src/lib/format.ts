const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const shortDateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatCurrency(value: number | null | undefined): string {
  return currency.format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return shortDate.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return shortDateTime.format(new Date(value));
}
