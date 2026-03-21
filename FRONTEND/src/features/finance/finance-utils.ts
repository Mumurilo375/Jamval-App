import type { PaymentMethod, ReceivableListItem, ReceivableStatus, VisitType } from "../../types/domain";

export type FinanceQueueStatus = "PENDING" | "PARTIAL" | "PAID";

export const financeQueueStatusOptions: Array<{ value: FinanceQueueStatus; label: string }> = [
  { value: "PENDING", label: "Em aberto" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Quitado" }
];

export type FinanceView = "OPEN" | "PARTIAL" | "PAID" | "ALL";

export const financeViewOptions: Array<{ value: FinanceView; label: string }> = [
  { value: "OPEN", label: "Em aberto" },
  { value: "PARTIAL", label: "Parciais" },
  { value: "PAID", label: "Quitados" },
  { value: "ALL", label: "Todos" }
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

export function matchesFinanceView(receivable: ReceivableListItem, view: FinanceView): boolean {
  if (view === "ALL") {
    return true;
  }

  if (view === "OPEN") {
    return receivable.status === "PENDING" || receivable.status === "PARTIAL";
  }

  if (view === "PARTIAL") {
    return receivable.status === "PARTIAL";
  }

  return receivable.status === "PAID";
}

export function sortReceivables(receivables: ReceivableListItem[]): ReceivableListItem[] {
  return [...receivables].sort((left, right) => {
    const statusPriority = getReceivableStatusPriority(left.status) - getReceivableStatusPriority(right.status);

    if (statusPriority !== 0) {
      return statusPriority;
    }

    const outstandingDifference = Number(right.amountOutstanding) - Number(left.amountOutstanding);

    if (outstandingDifference !== 0) {
      return outstandingDifference;
    }

    return new Date(right.visit.visitedAt).getTime() - new Date(left.visit.visitedAt).getTime();
  });
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

export function summarizeReceivables(receivables: ReceivableListItem[]) {
  return receivables.reduce(
    (summary, receivable) => {
      if (receivable.status === "PENDING" || receivable.status === "PARTIAL") {
        summary.openCount += 1;
        summary.totalPendingAmount += Number(receivable.amountOutstanding);
      }

      if (receivable.status === "PARTIAL") {
        summary.partialCount += 1;
      }

      summary.totalReceivedAmount += Number(receivable.amountReceived);

      return summary;
    },
    {
      openCount: 0,
      partialCount: 0,
      totalPendingAmount: 0,
      totalReceivedAmount: 0
    }
  );
}

export function groupClientsByOutstanding(receivables: ReceivableListItem[], limit = 3) {
  const grouped = new Map<
    string,
    {
      clientId: string;
      tradeName: string;
      outstandingAmount: number;
      receivableCount: number;
    }
  >();

  for (const receivable of receivables) {
    if (receivable.amountOutstanding <= 0) {
      continue;
    }

    const current = grouped.get(receivable.clientId) ?? {
      clientId: receivable.clientId,
      tradeName: receivable.client.tradeName,
      outstandingAmount: 0,
      receivableCount: 0
    };

    current.outstandingAmount += Number(receivable.amountOutstanding);
    current.receivableCount += 1;
    grouped.set(receivable.clientId, current);
  }

  return [...grouped.values()]
    .sort((left, right) => right.outstandingAmount - left.outstandingAmount)
    .slice(0, limit);
}

export function paymentMethodLabel(paymentMethod: PaymentMethod): string {
  if (paymentMethod === "BANK_TRANSFER") {
    return "Transferencia";
  }

  if (paymentMethod === "CARD") {
    return "Cartao";
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

function getReceivableStatusPriority(status: ReceivableStatus): number {
  if (status === "PARTIAL") {
    return 0;
  }

  if (status === "PENDING") {
    return 1;
  }

  return 2;
}
