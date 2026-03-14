import type { ClientProduct, VisitDetail, VisitStatus } from "../../types/domain";
import type { VisitItemDraftPayload } from "./visits-api";

export function visitStatusLabel(status: VisitStatus): string {
  if (status === "DRAFT") {
    return "Rascunho";
  }

  if (status === "COMPLETED") {
    return "Concluida";
  }

  return "Cancelada";
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
  unitPrice: number;
  restockedQuantity: number;
}) {
  const quantitySold = input.quantityPrevious - input.quantityGoodRemaining - input.quantityDefectiveReturn;

  return {
    quantitySold,
    subtotalAmount: Number((Math.max(quantitySold, 0) * input.unitPrice).toFixed(2)),
    resultingClientQuantity: input.quantityGoodRemaining + input.restockedQuantity
  };
}

export function visitNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDecimalInput(value: string): string {
  return value.trim().replace(",", ".");
}

export function parseDecimalInput(value: string): number {
  const normalized = normalizeDecimalInput(value);
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function computeVisitPendingAmount(totalAmount: number | string, receivedAmountOnVisit: number | string): number {
  const total = visitNumber(totalAmount);
  const received = visitNumber(receivedAmountOnVisit);

  return Number(Math.max(total - received, 0).toFixed(2));
}

export function buildSuggestedPreviousByProductId(completedVisits: VisitDetail[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const completedVisit of completedVisits) {
    for (const visitItem of completedVisit.items) {
      if (map[visitItem.productId] === undefined) {
        map[visitItem.productId] = Number(visitItem.resultingClientQuantity);
      }
    }
  }

  return map;
}

export function buildAutoPopulatedVisitItems(args: {
  catalogItems: ClientProduct[];
  suggestedPreviousByProductId: Record<string, number>;
  existingProductIds?: string[];
}): VisitItemDraftPayload[] {
  const existingProductIds = new Set(args.existingProductIds ?? []);
  const items: VisitItemDraftPayload[] = [];

  for (const catalogItem of args.catalogItems) {
    if (existingProductIds.has(catalogItem.productId)) {
      continue;
    }

    const quantityPrevious = args.suggestedPreviousByProductId[catalogItem.productId];
    if (!quantityPrevious || quantityPrevious <= 0) {
      continue;
    }

    items.push({
      productId: catalogItem.productId,
      clientProductId: catalogItem.id,
      quantityPrevious,
      quantityGoodRemaining: quantityPrevious,
      quantityDefectiveReturn: 0,
      quantityLoss: 0,
      unitPrice: Number(catalogItem.currentUnitPrice),
      suggestedRestockQuantity: 0,
      restockedQuantity: 0
    });
  }

  return items;
}
