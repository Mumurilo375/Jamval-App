import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();

export const clientIdParamSchema = z.object({
  id: z.string().uuid()
});

export const clientListQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional()
});

export const createClientBodySchema = z.object({
  tradeName: nonEmptyString.max(200),
  legalName: optionalText,
  documentNumber: optionalText,
  stateRegistration: optionalText,
  contactName: optionalText,
  phone: optionalText,
  addressLine: optionalText,
  addressCity: optionalText,
  addressState: optionalText,
  addressZipcode: optionalText,
  notes: z.string().trim().optional(),
  visitCycleDays: z.coerce.number().int().positive().optional(),
  requiresInvoice: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true)
});

export const updateClientBodySchema = createClientBodySchema.partial();
