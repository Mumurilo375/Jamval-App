import { z } from "zod";

const MAX_MONEY = 9_999_999_999.99;
const MAX_QUANTITY = 1_000_000;
const MAX_VISIT_CYCLE_DAYS = 3650;

function emptyStringToUndefined(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function emptyStringToNull(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return value;
}

function parseNumericValue(value: unknown): unknown {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");

    if (normalized.length === 0) {
      return value;
    }

    return Number(normalized);
  }

  return value;
}

function parseOptionalNumericValue(value: unknown): unknown {
  const optionalValue = emptyStringToUndefined(value);
  return optionalValue === undefined ? undefined : parseNumericValue(optionalValue);
}

function parseNullableNumericValue(value: unknown): unknown {
  const nullableValue = emptyStringToNull(value);
  return nullableValue === null || nullableValue === undefined ? nullableValue : parseNumericValue(nullableValue);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCnpj(value: string): string {
  const digits = onlyDigits(value);
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatPhone(value: string): string {
  const digits = onlyDigits(value);

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatZipcode(value: string): string {
  const digits = onlyDigits(value);
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

const cnpjValueSchema = z
  .string()
  .trim()
  .refine((value) => onlyDigits(value).length === 14, "Informe um CNPJ com 14 digitos")
  .transform(formatCnpj);

const phoneValueSchema = z
  .string()
  .trim()
  .refine((value) => [10, 11].includes(onlyDigits(value).length), "Informe um telefone com DDD e 10 ou 11 digitos")
  .transform(formatPhone);

const zipcodeValueSchema = z
  .string()
  .trim()
  .refine((value) => onlyDigits(value).length === 8, "Informe um CEP com 8 digitos")
  .transform(formatZipcode);

export const booleanQuerySchema = z.preprocess((value) => {
  const optionalValue = emptyStringToUndefined(value);

  if (optionalValue === undefined || typeof optionalValue === "boolean") {
    return optionalValue;
  }

  if (typeof optionalValue === "string") {
    const normalized = optionalValue.trim().toLowerCase();

    if (["true", "1"].includes(normalized)) {
      return true;
    }

    if (["false", "0"].includes(normalized)) {
      return false;
    }
  }

  return optionalValue;
}, z.boolean().optional());

export function requiredTrimmedString(maxLength: number, message = "Campo obrigatorio") {
  return z.string().trim().min(1, message).max(maxLength);
}

export function optionalTrimmedString(maxLength: number) {
  return z.preprocess(emptyStringToUndefined, z.string().trim().min(1).max(maxLength).optional());
}

export function optionalNullableTrimmedString(maxLength: number) {
  return z.preprocess(emptyStringToNull, z.string().trim().min(1).max(maxLength).nullable().optional());
}

export const optionalCnpjSchema = z.preprocess(emptyStringToUndefined, cnpjValueSchema.optional());
export const optionalNullableCnpjSchema = z.preprocess(emptyStringToNull, cnpjValueSchema.nullable().optional());

export const optionalPhoneSchema = z.preprocess(emptyStringToUndefined, phoneValueSchema.optional());
export const optionalNullablePhoneSchema = z.preprocess(emptyStringToNull, phoneValueSchema.nullable().optional());

export const optionalZipcodeSchema = z.preprocess(emptyStringToUndefined, zipcodeValueSchema.optional());

export const optionalBrazilStateSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .length(2, "Informe a UF com 2 letras")
    .regex(/^[A-Za-z]{2}$/, "Informe uma UF valida")
    .transform((value) => value.toUpperCase())
    .optional()
);

export const optionalPositiveVisitCycleDaysSchema = z.preprocess(
  parseOptionalNumericValue,
  z.number().int().positive().max(MAX_VISIT_CYCLE_DAYS).optional()
);

export const nonNegativeMoneySchema = z.preprocess(
  parseNumericValue,
  z.number().finite().min(0).max(MAX_MONEY)
);

export const positiveMoneySchema = z.preprocess(
  parseNumericValue,
  z.number().finite().positive().max(MAX_MONEY)
);

export const optionalNonNegativeMoneySchema = z.preprocess(
  parseOptionalNumericValue,
  z.number().finite().min(0).max(MAX_MONEY).optional()
);

export const optionalNullableNonNegativeMoneySchema = z.preprocess(
  parseNullableNumericValue,
  z.number().finite().min(0).max(MAX_MONEY).nullable().optional()
);

export const nonNegativeIntSchema = z.preprocess(
  parseNumericValue,
  z.number().int().min(0).max(MAX_QUANTITY)
);

export const positiveIntSchema = z.preprocess(
  parseNumericValue,
  z.number().int().min(1).max(MAX_QUANTITY)
);

export const optionalNonNegativeIntSchema = z.preprocess(
  parseOptionalNumericValue,
  z.number().int().min(0).max(MAX_QUANTITY).optional()
);

export const optionalNullableNonNegativeIntSchema = z.preprocess(
  parseNullableNumericValue,
  z.number().int().min(0).max(MAX_QUANTITY).nullable().optional()
);

export const simpleDateSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return value;
    }

    const date = new Date(`${trimmed}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
      return value;
    }

    return date;
  }

  return value;
}, z.date().optional());

export const dateTimeSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return value;
}, z.date().optional());

export function dateRangeRefinement<T extends { dateFrom?: Date; dateTo?: Date }>(value: T): boolean {
  return !value.dateFrom || !value.dateTo || value.dateFrom.getTime() <= value.dateTo.getTime();
}
