export function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeDecimalInput(value: string): string {
  return value.trim().replace(",", ".");
}

export function parseDecimalInput(value: string): number {
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return parseDecimalInput(trimmed);
}

export function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return parseDecimalInput(trimmed);
}

export function isIntegerInput(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function isNonNegativeIntegerInput(value: string): boolean {
  return isIntegerInput(value);
}

export function isPositiveIntegerInput(value: string): boolean {
  return isIntegerInput(value) && Number(value) > 0;
}
