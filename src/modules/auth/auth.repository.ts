import type { Prisma, User } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";

type UpdateUserSessionInput = {
  sessionTokenHash: string | null;
  sessionExpiresAt: Date | null;
  lastLoginAt?: Date | null;
};

export class AuthRepository {
  async findById(id: string, db: DbClient = prisma): Promise<User | null> {
    return db.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string, db: DbClient = prisma): Promise<User | null> {
    return db.user.findUnique({
      where: { email }
    });
  }

  async findBySessionTokenHash(sessionTokenHash: string, db: DbClient = prisma): Promise<User | null> {
    return db.user.findUnique({
      where: { sessionTokenHash }
    });
  }

  async updateSession(id: string, input: UpdateUserSessionInput, db: DbClient = prisma): Promise<User> {
    return db.user.update({
      where: { id },
      data: {
        sessionTokenHash: input.sessionTokenHash,
        sessionExpiresAt: input.sessionExpiresAt,
        ...(input.lastLoginAt !== undefined ? { lastLoginAt: input.lastLoginAt } : {})
      }
    });
  }

  async clearSession(id: string, db: DbClient = prisma): Promise<User> {
    return db.user.update({
      where: { id },
      data: {
        sessionTokenHash: null,
        sessionExpiresAt: null
      }
    });
  }
}
