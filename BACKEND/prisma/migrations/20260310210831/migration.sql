-- AlterTable
ALTER TABLE "CentralStockBalance" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CentralStockMovement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ClientProduct" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConsignedStockBalance" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConsignedStockMovement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReceiptDocument" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Receivable" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Visit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VisitItem" ALTER COLUMN "id" DROP DEFAULT;
