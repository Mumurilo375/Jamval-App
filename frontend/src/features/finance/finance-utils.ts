import type { PaymentMethod, ReceivableListItem, ReceivableStatus, VisitType } from "../../types/domain";

export type FinanceQueueStatus = "PENDING" | "PARTIAL" | "PAID";

export const financeQueueStatusOptions: Array<{ value: FinanceQueueStatus; label: string }> = [
  { value: "PENDING", label: "Em aberto" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Quitado" }
];

export function receivableStatusLabel(status: ReceivableStatus): string {
  if (status === "PARTIAL") {
    return "Parcial";
  }

  if (status === "PAID") {
    return "Quitado";
  }

  return "Em aberto";
}

export function receivableStatusTone(status: ReceivableStatus): "neutral" | "warning" | "success" {
  if (status === "PARTIAL") {
    return "warning";
  }

  if (status === "PAID") {
    return "success";
  }

  return "neutral";
}

export function sortReceivablesForQueue(receivables: ReceivableListItem[]): ReceivableListItem[] {
  return [...receivables].sort((left, right) => {
    const visitedAtDifference = new Date(right.visit.visitedAt).getTime() - new Date(left.visit.visitedAt).getTime();

    if (visitedAtDifference !== 0) {
      return visitedAtDifference;
    }

    return Number(right.amountOutstanding) - Number(left.amountOutstanding);
  });
}

export function paymentMethodLabel(paymentMethod: PaymentMethod): string {
  if (paymentMethod === "BANK_TRANSFER") {
    return "Transferência";
  }

  if (paymentMethod === "CARD") {
    return "Cartão";
  }

  if (paymentMethod === "CASH") {
    return "Dinheiro";
  }

  if (paymentMethod === "PIX") {
    return "PIX";
  }

  return "Outro";
}

export function normalizeFinanceQueueStatus(value: string | null): FinanceQueueStatus {
  if (value === "PARTIAL" || value === "PAID") {
    return value;
  }

  return "PENDING";
}

export function receivableOriginLabel(visitType: VisitType): string {
  return visitType === "SALE" ? "Venda" : "Acerto";
}

export function buildReceivableRoute(receivableId: string, status: ReceivableStatus): string {
  return `/financeiro/${receivableId}?status=${status}`;
}
