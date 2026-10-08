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
          message: "Os dados enviados são inválidos. Revise os campos e tente novamente.",
          details: error.flatten()
        }
      });
      return;
    }

    if (isDatabaseUnavailableError(error)) {
      reply.status(503).send({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "O sistema está temporariamente sem acesso ao banco de dados. Tente novamente mais tarde.",
          details: null
        }
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.status(409).send({
          error: {
            code: "CONFLICT",
            message: "Já existe um cadastro com esses dados.",
            details: error.meta ?? null
          }
        });
        return;
      }

      if (error.code === "P2025") {
        reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "O registro solicitado não foi encontrado.",
            details: error.meta ?? null
          }
        });
        return;
      }
    }

    reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível concluir esta operação agora. Tente novamente em instantes.",
        details: env.NODE_ENV === "production" ? null : formatUnexpectedError(error)
      }
    });
  });
}

function isDatabaseConnectionError(code: string): boolean {
  return ["P1001", "P1002", "P1003", "P1017", "P2024", "P2037"].includes(code);
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && isDatabaseConnectionError(error.code)) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError &&
    error.errorCode &&
    isDatabaseConnectionError(error.errorCode)
  ) {
    return true;
  }

  if (
    !(error instanceof Prisma.PrismaClientInitializationError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError) &&
    !(error instanceof Prisma.PrismaClientKnownRequestError)
  ) {
    return false;
  }

  // Supavisor can report session exhaustion without a Prisma errorCode.
  return /EMAXCONNSESSION|MaxClientsInSessionMode|too many clients already/i.test(error.message);
}

function formatUnexpectedError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { value: String(error) };
}
