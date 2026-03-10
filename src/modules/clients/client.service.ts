import type { Client } from "@prisma/client";

import { NotFoundError } from "../../shared/errors/not-found-error";
import type { ClientListQuery, CreateClientInput, UpdateClientInput } from "./client.types";
import { ClientRepository } from "./client.repository";

export class ClientService {
  constructor(private readonly repository = new ClientRepository()) {}

  list(filters: ClientListQuery): Promise<Client[]> {
    return this.repository.list(filters);
  }

  async getById(id: string): Promise<Client> {
    const client = await this.repository.findById(id);

    if (!client) {
      throw new NotFoundError("Client not found", { id });
    }

    return client;
  }

  create(data: CreateClientInput): Promise<Client> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateClientInput): Promise<Client> {
    await this.getById(id);
    return this.repository.update(id, data);
  }
}
