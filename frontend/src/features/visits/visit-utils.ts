import type { VisitStatus } from "../../types/domain";

export function visitStatusLabel(status: VisitStatus): string {
  if (status === "DRAFT") {
    return "Draft";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  return "Cancelled";
}

export function visitStatusTone(status: VisitStatus): "warning" | "success" | "danger" {
  if (status === "DRAFT") {
    return "warning";
  }

  if (status === "COMPLETED") {
    return "success";
  }

  return "danger";
}

export function computeVisitItemPreview(input: {
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  unitPrice: number;
  restockedQuantity: number;
}) {
  const quantitySold =
    input.quantityPrevious - input.quantityGoodRemaining - input.quantityDefectiveReturn - input.quantityLoss;

  return {
    quantitySold,
    subtotalAmount: Number((Math.max(quantitySold, 0) * input.unitPrice).toFixed(2)),
    resultingClientQuantity: input.quantityGoodRemaining + input.restockedQuantity
  };
}
