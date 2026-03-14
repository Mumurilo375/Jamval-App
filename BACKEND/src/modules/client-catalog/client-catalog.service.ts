import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type {
  ClientCatalogListQuery,
  CreateClientCatalogInput,
  UpdateClientCatalogInput
} from "./client-catalog.types";
import { ClientCatalogRepository } from "./client-catalog.repository";

export class ClientCatalogService {
  constructor(private readonly repository = new ClientCatalogRepository()) {}

  async listByClient(clientId: string, query: ClientCatalogListQuery) {
    await this.ensureClientExists(clientId);
    return this.repository.listByClient(clientId, query);
  }

  async create(clientId: string, data: CreateClientCatalogInput) {
    await this.ensureClientExists(clientId);
    await this.ensureProductExists(data.productId);

    return this.repository.create(clientId, data);
  }

  async update(clientId: string, clientProductId: string, data: UpdateClientCatalogInput) {
    await this.ensureClientExists(clientId);

    const clientProduct = await this.repository.findById(clientProductId);

    if (!clientProduct || clientProduct.clientId !== clientId) {
      throw new NotFoundError("Client catalog item not found", { clientId, clientProductId });
    }

    return this.repository.update(clientProductId, data);
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const exists = await this.repository.clientExists(clientId);

    if (!exists) {
      throw new NotFoundError("Client not found", { clientId });
    }
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const exists = await this.repository.productExists(productId);

    if (!exists) {
      throw new AppError(400, "INVALID_PRODUCT", "Product does not exist", { productId });
    }
  }
}
