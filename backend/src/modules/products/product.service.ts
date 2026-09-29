import type { Prisma, Product } from "@prisma/client";

import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from "./product.types";

export class ProductService {
  list(filters: ProductListQuery): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { sku: { contains: filters.search, mode: "insensitive" } }
        ]
      })
    };
    return prisma.product.findMany({ where, orderBy: [{ name: "asc" }] });
  }

  async getById(id: string): Promise<Product> {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundError("Product not found", { id });
    }

    return product;
  }

  create(data: CreateProductInput): Promise<Product> {
    return prisma.product.create({ data });
  }

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    await this.getById(id);
    return prisma.product.update({ where: { id }, data });
  }

  activate(id: string): Promise<Product> {
    return this.update(id, { isActive: true });
  }

  deactivate(id: string): Promise<Product> {
    return this.update(id, { isActive: false });
  }
}
