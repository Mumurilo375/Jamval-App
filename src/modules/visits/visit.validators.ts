import { Prisma, VisitStatus, type ClientProduct, type Product, type Visit, type VisitItem } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import type {
  DraftVisitComputedItem,
  ExistingDraftVisitItemEditableFields,
  VisitDraftItemInput
} from "./visit.types";

export function ensureVisitIsDraft(visit: Pick<Visit, "id" | "status">): void {
  if (visit.status !== VisitStatus.DRAFT) {
    throw new AppError(409, "VISIT_NOT_EDITABLE", "Only DRAFT visits can be edited", {
      visitId: visit.id,
      status: visit.status
    });
  }
}

export function ensureVisitCanBeCompleted(visit: Pick<Visit, "id" | "status"> & { items?: unknown[] }): void {
  if (visit.status !== VisitStatus.DRAFT) {
    throw new AppError(409, "VISIT_NOT_COMPLETABLE", "Only DRAFT visits can be completed", {
      visitId: visit.id,
      status: visit.status
    });
  }

  if (visit.items && visit.items.length === 0) {
    throw new AppError(400, "VISIT_WITHOUT_ITEMS", "Cannot complete a visit without items", {
      visitId: visit.id
    });
  }
}

export function generateVisitCode(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `VIS-${datePart}-${randomPart}`;
}

export function buildProductSnapshot(product: Product): Pick<
  DraftVisitComputedItem,
  "productSnapshotName" | "productSnapshotSku" | "productSnapshotLabel"
> {
  const labelParts = [
    product.name,
    product.brand,
    product.model,
    product.color,
    product.voltage,
    product.connectorType
  ].filter((value): value is string => Boolean(value));

  return {
    productSnapshotName: product.name,
    productSnapshotSku: product.sku,
    productSnapshotLabel: labelParts.join(" | ")
  };
}

export function computeDraftVisitItem(
  input: {
    product: Product;
    clientProduct: ClientProduct | null;
    unitPrice: number;
  } & Pick<
    VisitDraftItemInput,
    | "clientProductId"
    | "quantityPrevious"
    | "quantityGoodRemaining"
    | "quantityDefectiveReturn"
    | "quantityLoss"
    | "suggestedRestockQuantity"
    | "restockedQuantity"
    | "notes"
  >
): DraftVisitComputedItem {
  assertNonNegative("quantityPrevious", input.quantityPrevious);
  assertNonNegative("quantityGoodRemaining", input.quantityGoodRemaining);
  assertNonNegative("quantityDefectiveReturn", input.quantityDefectiveReturn);
  assertNonNegative("quantityLoss", input.quantityLoss);
  assertNonNegative("suggestedRestockQuantity", input.suggestedRestockQuantity);
  assertNonNegative("restockedQuantity", input.restockedQuantity);
  assertNonNegative("unitPrice", input.unitPrice);

  const quantitySold =
    input.quantityPrevious -
    input.quantityGoodRemaining -
    input.quantityDefectiveReturn -
    input.quantityLoss;

  if (quantitySold < 0) {
    throw new AppError(400, "INVALID_VISIT_ITEM", "Visit item results in a negative quantitySold", {
      productId: input.product.id
    });
  }

  const subtotalAmount = toMoney(quantitySold * input.unitPrice);
  const resultingClientQuantity = input.quantityGoodRemaining + input.restockedQuantity;

  const snapshot = buildProductSnapshot(input.product);

  return {
    clientProductId: input.clientProduct?.id ?? input.clientProductId ?? null,
    productId: input.product.id,
    ...snapshot,
    quantityPrevious: input.quantityPrevious,
    quantityGoodRemaining: input.quantityGoodRemaining,
    quantityDefectiveReturn: input.quantityDefectiveReturn,
    quantityLoss: input.quantityLoss,
    quantitySold,
    unitPrice: toMoney(input.unitPrice),
    subtotalAmount,
    suggestedRestockQuantity: input.suggestedRestockQuantity,
    restockedQuantity: input.restockedQuantity,
    resultingClientQuantity,
    ...(input.notes ? { notes: input.notes } : {})
  };
}

export function mergeEditableVisitItemFields(
  existing: ExistingDraftVisitItemEditableFields,
  patch: Partial<ExistingDraftVisitItemEditableFields>
): ExistingDraftVisitItemEditableFields {
  return {
    clientProductId: patch.clientProductId !== undefined ? patch.clientProductId : existing.clientProductId,
    quantityPrevious: patch.quantityPrevious ?? existing.quantityPrevious,
    quantityGoodRemaining: patch.quantityGoodRemaining ?? existing.quantityGoodRemaining,
    quantityDefectiveReturn: patch.quantityDefectiveReturn ?? existing.quantityDefectiveReturn,
    quantityLoss: patch.quantityLoss ?? existing.quantityLoss,
    unitPrice: patch.unitPrice ?? existing.unitPrice,
    suggestedRestockQuantity: patch.suggestedRestockQuantity ?? existing.suggestedRestockQuantity,
    restockedQuantity: patch.restockedQuantity ?? existing.restockedQuantity,
    notes: patch.notes !== undefined ? patch.notes : existing.notes
  };
}

export function ensureClientProductMatchesVisit(
  visitClientId: string,
  productId: string,
  clientProduct: ClientProduct | null
): asserts clientProduct is ClientProduct {
  if (!clientProduct) {
    throw new AppError(
      400,
      "INVALID_CLIENT_PRODUCT",
      "Client product configuration is required for this visit item",
      { clientId: visitClientId, productId }
    );
  }

  if (clientProduct.clientId !== visitClientId || clientProduct.productId !== productId) {
    throw new AppError(
      400,
      "INVALID_CLIENT_PRODUCT",
      "clientProductId does not belong to the visit client and product",
      { clientId: visitClientId, productId, clientProductId: clientProduct.id }
    );
  }
}

export function ensureReceivedAmountWithinTotal(
  receivedAmountOnVisit: Prisma.Decimal | number,
  totalAmount: Prisma.Decimal | number
): void {
  const received = new Prisma.Decimal(receivedAmountOnVisit);
  const total = new Prisma.Decimal(totalAmount);

  if (received.lessThan(0)) {
    throw new AppError(400, "INVALID_RECEIVED_AMOUNT", "receivedAmountOnVisit cannot be negative");
  }

  if (received.greaterThan(total)) {
    throw new AppError(
      400,
      "INVALID_RECEIVED_AMOUNT",
      "receivedAmountOnVisit cannot be greater than totalAmount in the current draft",
      {
        receivedAmountOnVisit: received.toString(),
        totalAmount: total.toString()
      }
    );
  }
}

export function recomputeVisitItemForCompletion(
  item: Pick<
    VisitItem,
    | "id"
    | "productId"
    | "quantityPrevious"
    | "quantityGoodRemaining"
    | "quantityDefectiveReturn"
    | "quantityLoss"
    | "restockedQuantity"
    | "unitPrice"
  >
): {
  quantitySold: number;
  subtotalAmount: Prisma.Decimal;
  resultingClientQuantity: number;
} {
  assertNonNegative("quantityPrevious", item.quantityPrevious);
  assertNonNegative("quantityGoodRemaining", item.quantityGoodRemaining);
  assertNonNegative("quantityDefectiveReturn", item.quantityDefectiveReturn);
  assertNonNegative("quantityLoss", item.quantityLoss);
  assertNonNegative("restockedQuantity", item.restockedQuantity);

  const unitPrice = new Prisma.Decimal(item.unitPrice);

  if (unitPrice.lessThan(0)) {
    throw new AppError(400, "INVALID_VISIT_ITEM", "unitPrice cannot be negative", {
      itemId: item.id,
      productId: item.productId
    });
  }

  const quantitySold =
    item.quantityPrevious -
    item.quantityGoodRemaining -
    item.quantityDefectiveReturn -
    item.quantityLoss;

  if (quantitySold < 0) {
    throw new AppError(400, "INVALID_VISIT_ITEM", "Visit item results in a negative quantitySold", {
      itemId: item.id,
      productId: item.productId
    });
  }

  return {
    quantitySold,
    subtotalAmount: unitPrice.mul(quantitySold).toDecimalPlaces(2),
    resultingClientQuantity: item.quantityGoodRemaining + item.restockedQuantity
  };
}

function assertNonNegative(field: string, value: number): void {
  if (value < 0) {
    throw new AppError(400, "INVALID_VISIT_ITEM", `${field} cannot be negative`, { field, value });
  }
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
