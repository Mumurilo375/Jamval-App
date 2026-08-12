import type {
  OperationalHistoryVisit,
  OperationalReturnQueueItem
} from "../../types/domain";

export function formatDaysSince(value: string): string {
  const target = new Date(value);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = todayStart.getTime() - targetStart.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (diffDays === 0) {
    return "hoje";
  }

  if (diffDays === 1) {
    return "ha 1 dia";
  }

  return `ha ${diffDays} dias`;
}

export function formatReturnQueueSummary(item: OperationalReturnQueueItem): string {
  if (item.baseQuantity <= 0) {
    return "Base zerada";
  }

  return `${formatItemCount(item.itemCount)} • base atual ${item.baseQuantity}`;
}

export function historyActionLabel(item: OperationalHistoryVisit): string {
  return item.hasReceipt ? "Comprovante" : "Ver";
}

function formatItemCount(itemCount: number): string {
  return itemCount === 1 ? "1 item" : `${itemCount} itens`;
}
