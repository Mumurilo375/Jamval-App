import { z } from "zod";

import {
  booleanQuerySchema,
  optionalBrazilStateSchema,
  optionalCnpjSchema,
  optionalPhoneSchema,
  optionalPositiveVisitCycleDaysSchema,
  optionalTrimmedString,
  optionalZipcodeSchema,
  requiredTrimmedString
} from "../../shared/validation/schemas";

export const clientIdParamSchema = z.object({
  id: z.string().uuid()
});

export const clientListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  isActive: booleanQuerySchema
});

export const createClientBodySchema = z
  .object({
    tradeName: requiredTrimmedString(200),
    legalName: optionalTrimmedString(200),
    documentNumber: optionalCnpjSchema,
    stateRegistration: optionalTrimmedString(32),
    contactName: optionalTrimmedString(160),
    phone: optionalPhoneSchema,
    addressLine: optionalTrimmedString(200),
    addressCity: optionalTrimmedString(120),
    addressState: optionalBrazilStateSchema,
    addressZipcode: optionalZipcodeSchema,
    notes: optionalTrimmedString(2000),
    visitCycleDays: optionalPositiveVisitCycleDaysSchema,
    requiresInvoice: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true)
  })
  .strict();

export const updateClientBodySchema = createClientBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Informe ao menos um campo para atualizar"
});
