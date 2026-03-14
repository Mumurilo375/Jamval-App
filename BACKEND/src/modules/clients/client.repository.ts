import type { Client, Prisma } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type { ClientListQuery, CreateClientInput, UpdateClientInput } from "./client.types";

export class ClientRepository {
  async list(filters: ClientListQuery, db: DbClient = prisma): Promise<Client[]> {
    const where: Prisma.ClientWhereInput = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { tradeName: { contains: filters.search, mode: "insensitive" } },
              { legalName: { contains: filters.search, mode: "insensitive" } },
              { documentNumber: { contains: filters.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    return db.client.findMany({
      where,
      orderBy: [{ tradeName: "asc" }]
    });
  }

  async findById(id: string, db: DbClient = prisma): Promise<Client | null> {
    return db.client.findUnique({ where: { id } });
  }

  async create(data: CreateClientInput, db: DbClient = prisma): Promise<Client> {
    return db.client.create({ data });
  }

  async update(id: string, data: UpdateClientInput, db: DbClient = prisma): Promise<Client> {
    return db.client.update({
      where: { id },
      data
    });
  }
}
