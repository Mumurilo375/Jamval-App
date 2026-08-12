import { createCentralInitialLoad } from "./stock-api";
import { StockBatchPage } from "./stock-batch-page";

export function StockInitialLoadPage() {
  return <StockBatchPage mode="initial-load" submitBatch={createCentralInitialLoad} />;
}
