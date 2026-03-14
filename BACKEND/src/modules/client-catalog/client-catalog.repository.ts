import type { Client, ClientProduct, Prisma, Product } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type {
  ClientCatalogListQuery,
  CreateClientCatalogInput,
  UpdateClientCatalogInput
} from "./client-catalog.types";

const catalogInclude = {
  client: true,
  product: true
} satisfies Prisma.ClientProductInclude;

export type ClientCatalogItem = Prisma.ClientProductGetPayload<{
  include: typeof catalogInclude;
}>;

export class ClientCatalogRepository {
  async clientExists(clientId: string, db: DbClient = prisma): Promise<boolean> {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    return Boolean(client);
  }

  async productExists(productId: string, db: DbClient = prisma): Promise<boolean> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true }
    });

    return Boolean(product);
  }

  async getClient(clientId: string, db: DbClient = prisma): Promise<Client | null> {
    return db.client.findUnique({ where: { id: clientId } });
  }

  async getProduct(productId: string, db: DbClient = prisma): Promise<Product | null> {
    return db.product.findUnique({ where: { id: productId } });
  }

  async listByClient(clientId: string, query: ClientCatalogListQuery, db: DbClient = prisma): Promise<ClientCatalogItem[]> {
    return db.clientProduct.findMany({
      where: {
        clientId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {})
      },
      include: catalogInclude,
      orderBy: [{ displayOrder: "asc" }, { product: { name: "asc" } }]
    });
  }

  async findById(clientProductId: string, db: DbClient = prisma): Promise<ClientCatalogItem | null> {
    return db.clientProduct.findUnique({
      where: { id: clientProductId },
      include: catalogInclude
    });
  }

  async create(clientId: string, data: CreateClientCatalogInput, db: DbClient = prisma): Promise<ClientCatalogItem> {
    return db.clientProduct.create({
      data: {
        clientId,
        ...data
      },
      include: catalogInclude
    });
  }

  async update(clientProductId: string, data: UpdateClientCatalogInput, db: DbClient = prisma): Promise<ClientCatalogItem> {
    return db.clientProduct.update({
      where: { id: clientProductId },
      data,
      include: catalogInclude
    });
  }
}
