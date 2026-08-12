import type { Product } from "@prisma/client";

import { NotFoundError } from "../../shared/errors/not-found-error";
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from "./product.types";
import { ProductRepository } from "./product.repository";

export class ProductService {
  constructor(private readonly repository = new ProductRepository()) {}

  list(filters: ProductListQuery): Promise<Product[]> {
    return this.repository.list(filters);
  }

  async getById(id: string): Promise<Product> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new NotFoundError("Product not found", { id });
    }

    return product;
  }

  create(data: CreateProductInput): Promise<Product> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    await this.getById(id);
    return this.repository.update(id, data);
  }

  activate(id: string): Promise<Product> {
    return this.update(id, { isActive: true });
  }

  deactivate(id: string): Promise<Product> {
    return this.update(id, { isActive: false });
  }
}
