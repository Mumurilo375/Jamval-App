import { CentralStockMovementType } from "@prisma/client";

const MOVEMENT_LABELS: Record<CentralStockMovementType, string> = {
  INITIAL_LOAD: "Carga inicial",
  MANUAL_ENTRY: "Entrada manual",
  MANUAL_ADJUSTMENT_IN: "Ajuste +",
  MANUAL_ADJUSTMENT_OUT: "Ajuste -",
  RESTOCK_TO_CLIENT: "Saida para cliente",
  DIRECT_SALE_OUT: "Saida por venda",
  DEFECTIVE_RETURN_LOG: "Retorno com defeito"
};

export function formatMovementLabel(movementType: CentralStockMovementType): string {
  return MOVEMENT_LABELS[movementType];
}

export function getBalanceEffect(movementType: CentralStockMovementType): "IN" | "OUT" | "NEUTRAL" {
  if (
    movementType === CentralStockMovementType.INITIAL_LOAD ||
    movementType === CentralStockMovementType.MANUAL_ENTRY ||
    movementType === CentralStockMovementType.MANUAL_ADJUSTMENT_IN
  ) {
    return "IN";
  }
  return movementType === CentralStockMovementType.DEFECTIVE_RETURN_LOG ? "NEUTRAL" : "OUT";
}

export function toMovementSnapshot(movement: { movementType: CentralStockMovementType; createdAt: Date } | null) {
  if (!movement) return null;
  return {
    label: formatMovementLabel(movement.movementType),
    balanceEffect: getBalanceEffect(movement.movementType),
    createdAt: movement.createdAt
  };
}
