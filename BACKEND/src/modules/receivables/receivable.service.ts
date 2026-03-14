import { ReceivableStatus } from "@prisma/client";

import { ClientRepository } from "../clients/client.repository";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type { ReceivableDetailItem, ReceivableListItem, ReceivableListQuery } from "./receivable.types";
import { ReceivableRepository } from "./receivable.repository";

export class ReceivableService {
  constructor(
    private readonly repository = new ReceivableRepository(),
    private readonly clientRepository = new ClientRepository()
  ) {}

  async list(filters: ReceivableListQuery) {
    const receivables = await this.repository.list(filters);
    return receivables.map((receivable) => mapReceivableForRead(receivable));
  }

  async getById(id: string) {
    const receivable = await this.repository.findByIdWithDetails(id);

    if (!receivable) {
      throw new NotFoundError("Receivable not found", { id });
    }

    return mapReceivableDetailForRead(receivable);
  }

  async listByClient(clientId: string) {
    await this.ensureClientExists(clientId);
    const receivables = await this.repository.list({ clientId });
    return receivables.map((receivable) => mapReceivableForRead(receivable));
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.clientRepository.findById(clientId);

    if (!client) {
      throw new NotFoundError("Client not found", { id: clientId });
    }
  }
}

function mapReceivableForRead(receivable: ReceivableListItem) {
  const isOverdue = computeIsOverdue(receivable.status, receivable.dueDate);

  return {
    ...receivable,
    isOverdue,
    displayStatus: isOverdue ? "OVERDUE" : receivable.status
  };
}

function mapReceivableDetailForRead(receivable: ReceivableDetailItem) {
  const isOverdue = computeIsOverdue(receivable.status, receivable.dueDate);

  return {
    ...receivable,
    isOverdue,
    displayStatus: isOverdue ? "OVERDUE" : receivable.status
  };
}

function computeIsOverdue(status: ReceivableStatus, dueDate: Date | null): boolean {
  if (!dueDate || status === ReceivableStatus.PAID) {
    return false;
  }

  return dueDate.getTime() < startOfUtcDay(new Date()).getTime();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
