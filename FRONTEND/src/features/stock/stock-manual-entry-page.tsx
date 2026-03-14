import { createCentralManualEntry } from "./stock-api";
import { StockBatchPage } from "./stock-batch-page";

export function StockManualEntryPage() {
  return <StockBatchPage mode="manual-entry" submitBatch={createCentralManualEntry} />;
}
