import { Prisma, ReceivableStatus } from "@prisma/client";

import { prisma } from "../../db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import { ClientRepository } from "../clients/client.repository";
import { ReceivableRepository } from "../receivables/receivable.repository";
import { PaymentRepository } from "./payment.repository";
import type { CreatePaymentInput } from "./payment.types";

export class PaymentService {
  constructor(
    private readonly repository = new PaymentRepository(),
    private readonly receivableRepository = new ReceivableRepository(),
    private readonly clientRepository = new ClientRepository()
  ) {}

  async create(receivableId: string, input: CreatePaymentInput) {
    const result = await prisma.$transaction(async (tx) => {
      const receivable = await this.receivableRepository.findById(receivableId, tx);

      if (!receivable) {
        throw new NotFoundError("Receivable not found", { id: receivableId });
      }

      const paymentAmount = new Prisma.Decimal(input.amount);

      if (paymentAmount.lessThanOrEqualTo(0)) {
        throw new AppError(400, "INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero", {
          receivableId,
          amount: paymentAmount.toString()
        });
      }

      const currentAggregate = await this.repository.aggregateByReceivable(receivableId, tx);
      const currentOutstanding = subtractMoney(receivable.originalAmount, currentAggregate.amountReceived);

      if (paymentAmount.greaterThan(currentOutstanding)) {
        throw new AppError(409, "PAYMENT_EXCEEDS_OUTSTANDING", "Payment amount exceeds the outstanding balance", {
          receivableId,
          attemptedAmount: paymentAmount.toString(),
          amountOutstanding: currentOutstanding.toString(),
          originalAmount: receivable.originalAmount.toString(),
          amountReceived: currentAggregate.amountReceived.toString()
        });
      }

      const payment = await this.repository.create(
        {
          receivableId,
          amount: paymentAmount,
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          notes: input.notes
        },
        tx
      );

      const nextAggregate = await this.repository.aggregateByReceivable(receivableId, tx);
      const amountOutstanding = subtractMoney(receivable.originalAmount, nextAggregate.amountReceived);
      const status = determineReceivableStatus(nextAggregate.amountReceived, amountOutstanding);

      await this.receivableRepository.updateFinancialSnapshot(
        receivableId,
        {
          amountReceived: nextAggregate.amountReceived,
          amountOutstanding,
          status,
          settledAt: status === ReceivableStatus.PAID ? nextAggregate.latestPaidAt : null
        },
        tx
      );

      return {
        paymentId: payment.id,
        receivableId
      };
    });

    const payment = await this.repository.findById(result.paymentId);
    const receivable = await this.receivableRepository.findByIdWithDetails(result.receivableId);

    if (!payment || !receivable) {
      throw new AppError(500, "PAYMENT_PERSISTENCE_ERROR", "Payment was created but could not be reloaded");
    }

    return {
      payment,
      receivable
    };
  }

  async listByClient(clientId: string) {
    await this.ensureClientExists(clientId);
    return this.repository.listByClient(clientId);
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.clientRepository.findById(clientId);

    if (!client) {
      throw new NotFoundError("Client not found", { id: clientId });
    }
  }
}

function subtractMoney(totalAmount: Prisma.Decimal, amountReceived: Prisma.Decimal): Prisma.Decimal {
  const difference = totalAmount.minus(amountReceived);

  if (difference.lessThan(0)) {
    return new Prisma.Decimal(0);
  }

  return difference;
}

function determineReceivableStatus(
  amountReceived: Prisma.Decimal,
  amountOutstanding: Prisma.Decimal
): ReceivableStatus {
  if (amountOutstanding.equals(0)) {
    return ReceivableStatus.PAID;
  }

  if (amountReceived.greaterThan(0)) {
    return ReceivableStatus.PARTIAL;
  }

  return ReceivableStatus.PENDING;
}
