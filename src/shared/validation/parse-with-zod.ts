import type { ZodTypeAny, infer as ZodInfer } from "zod";

export function parseWithZod<TSchema extends ZodTypeAny>(
  schema: TSchema,
  input: unknown
): ZodInfer<TSchema> {
  return schema.parse(input);
}
