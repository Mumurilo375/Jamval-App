import type { Prisma, Product } from "@prisma/client";

import type { DbClient } from "../../db/db-client";
import { prisma } from "../../db/prisma";
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from "./product.types";

export class ProductRepository {
  async list(filters: ProductListQuery, db: DbClient = prisma): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { sku: { contains: filters.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    return db.product.findMany({
      where,
      orderBy: [{ name: "asc" }]
    });
  }

  async findById(id: string, db: DbClient = prisma): Promise<Product | null> {
    return db.product.findUnique({ where: { id } });
  }

  async create(data: CreateProductInput, db: DbClient = prisma): Promise<Product> {
    return db.product.create({ data });
  }

  async update(id: string, data: UpdateProductInput, db: DbClient = prisma): Promise<Product> {
    return db.product.update({
      where: { id },
      data
    });
  }
}
