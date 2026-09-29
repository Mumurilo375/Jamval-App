import type { ClientProduct, VisitDetail, VisitStatus, VisitType } from "../../types/domain";
export { normalizeDecimalInput, parseDecimalInput } from "../../lib/forms";
import type { VisitItemDraftPayload } from "./visits-api";

const visitLabels: Record<VisitStatus, string> = { DRAFT: "Não finalizada", COMPLETED: "Concluída", CANCELLED: "Cancelada" };
const visitTones: Record<VisitStatus, "warning" | "success" | "danger"> = { DRAFT: "warning", COMPLETED: "success", CANCELLED: "danger" };

export const visitStatusLabel = (status: VisitStatus) => visitLabels[status];
export const visitStatusTone = (status: VisitStatus) => visitTones[status];
export const visitTypeLabel = (type: VisitType) => type === "SALE" ? "Venda" : "Consignação";

export function computeVisitItemPreview(input: {
  quantityPrevious: number;
  quantitySold?: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss?: number;
  unitPrice: number;
  restockedQuantity: number;
}) {
  const quantitySold =
    input.quantitySold ??
    (input.quantityPrevious - input.quantityGoodRemaining - input.quantityDefectiveReturn - (input.quantityLoss ?? 0));

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
