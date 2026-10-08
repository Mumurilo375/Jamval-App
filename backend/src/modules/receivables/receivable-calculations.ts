import { Prisma, ReceivableStatus } from "@prisma/client";

export function subtractMoney(total: Prisma.Decimal, received: Prisma.Decimal): Prisma.Decimal {
  return Prisma.Decimal.max(total.minus(received), 0);
}

export function determineReceivableStatus(
  amountReceived: Prisma.Decimal,
  amountOutstanding: Prisma.Decimal
): ReceivableStatus {
  if (amountOutstanding.equals(0)) return ReceivableStatus.PAID;
  return amountReceived.greaterThan(0) ? ReceivableStatus.PARTIAL : ReceivableStatus.PENDING;
}
