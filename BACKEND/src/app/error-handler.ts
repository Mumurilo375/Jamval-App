import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten()
        }
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.status(409).send({
          error: {
            code: "CONFLICT",
            message: "A record with the same unique data already exists",
            details: error.meta ?? null
          }
        });
        return;
      }

      if (error.code === "P2025") {
        reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "The requested record was not found",
            details: error.meta ?? null
          }
        });
        return;
      }
    }

    reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
        details: env.NODE_ENV === "production" ? null : formatUnexpectedError(error)
      }
    });
  });
}

function formatUnexpectedError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { value: String(error) };
}
