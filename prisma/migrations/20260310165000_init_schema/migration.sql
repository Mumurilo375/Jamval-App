-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "CentralStockMovementType" AS ENUM (
  'INITIAL_LOAD',
  'MANUAL_ENTRY',
  'MANUAL_ADJUSTMENT_IN',
  'MANUAL_ADJUSTMENT_OUT',
  'RESTOCK_TO_CLIENT',
  'DEFECTIVE_RETURN_LOG'
);

-- CreateEnum
CREATE TYPE "ConsignedStockMovementType" AS ENUM (
  'INITIAL_LOAD',
  'RESTOCK_IN',
  'SALE_OUT',
  'DEFECTIVE_RETURN_OUT',
  'LOSS_OUT'
);

-- CreateEnum
CREATE TYPE "StockReferenceType" AS ENUM ('VISIT', 'MANUAL', 'INITIAL_LOAD', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Product" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sku" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "category" VARCHAR(120),
  "brand" VARCHAR(120),
  "model" VARCHAR(120),
  "color" VARCHAR(80),
  "voltage" VARCHAR(80),
  "connectorType" VARCHAR(80),
  "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tradeName" VARCHAR(200) NOT NULL,
  "legalName" VARCHAR(200),
  "documentNumber" VARCHAR(32),
  "stateRegistration" VARCHAR(32),
  "contactName" VARCHAR(160),
  "phone" VARCHAR(32),
  "addressLine" VARCHAR(200),
  "addressCity" VARCHAR(120),
  "addressState" VARCHAR(80),
  "addressZipcode" VARCHAR(16),
  "notes" TEXT,
  "visitCycleDays" INTEGER,
  "requiresInvoice" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProduct" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "currentUnitPrice" DECIMAL(12,2) NOT NULL,
  "idealQuantity" INTEGER,
  "displayOrder" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralStockBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "currentQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CentralStockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralStockMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "movementType" "CentralStockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "referenceType" "StockReferenceType" NOT NULL,
  "referenceId" UUID,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CentralStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignedStockBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "currentQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConsignedStockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignedStockMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "movementType" "ConsignedStockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "referenceType" "StockReferenceType" NOT NULL,
  "referenceId" UUID,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsignedStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitCode" VARCHAR(64) NOT NULL,
  "clientId" UUID NOT NULL,
  "status" "VisitStatus" NOT NULL DEFAULT 'DRAFT',
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "receivedAmountOnVisit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "dueDate" DATE,
  "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
  "signatureName" VARCHAR(160),
  "signatureImageKey" VARCHAR(255),
  "signedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitId" UUID NOT NULL,
  "clientProductId" UUID,
  "productId" UUID NOT NULL,
  "productSnapshotName" VARCHAR(200) NOT NULL,
  "productSnapshotSku" VARCHAR(120) NOT NULL,
  "productSnapshotLabel" VARCHAR(255) NOT NULL,
  "quantityPrevious" INTEGER NOT NULL DEFAULT 0,
  "quantityGoodRemaining" INTEGER NOT NULL DEFAULT 0,
  "quantityDefectiveReturn" INTEGER NOT NULL DEFAULT 0,
  "quantityLoss" INTEGER NOT NULL DEFAULT 0,
  "quantitySold" INTEGER NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "suggestedRestockQuantity" INTEGER NOT NULL DEFAULT 0,
  "restockedQuantity" INTEGER NOT NULL DEFAULT 0,
  "resultingClientQuantity" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VisitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "originalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amountReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amountOutstanding" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "ReceivableStatus" NOT NULL DEFAULT 'PENDING',
  "dueDate" DATE,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receivableId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "reference" VARCHAR(160),
  "notes" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitId" UUID NOT NULL,
  "storageKey" VARCHAR(255) NOT NULL,
  "fileName" VARCHAR(200) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL DEFAULT 'application/pdf',
  "checksum" VARCHAR(128),
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReceiptDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Client_tradeName_idx" ON "Client"("tradeName");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProduct_clientId_productId_key" ON "ClientProduct"("clientId", "productId");

-- CreateIndex
CREATE INDEX "ClientProduct_clientId_isActive_idx" ON "ClientProduct"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "ClientProduct_productId_isActive_idx" ON "ClientProduct"("productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CentralStockBalance_productId_key" ON "CentralStockBalance"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_central_move_ref_prod_type"
  ON "CentralStockMovement"("referenceType", "referenceId", "productId", "movementType");

-- CreateIndex
CREATE INDEX "CentralStockMovement_productId_createdAt_idx" ON "CentralStockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "CentralStockMovement_referenceType_referenceId_idx" ON "CentralStockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignedStockBalance_clientId_productId_key" ON "ConsignedStockBalance"("clientId", "productId");

-- CreateIndex
CREATE INDEX "ConsignedStockBalance_clientId_idx" ON "ConsignedStockBalance"("clientId");

-- CreateIndex
CREATE INDEX "ConsignedStockBalance_productId_idx" ON "ConsignedStockBalance"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_consigned_move_ref_cli_prod_type"
  ON "ConsignedStockMovement"("referenceType", "referenceId", "clientId", "productId", "movementType");

-- CreateIndex
CREATE INDEX "ConsignedStockMovement_clientId_createdAt_idx" ON "ConsignedStockMovement"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsignedStockMovement_productId_createdAt_idx" ON "ConsignedStockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsignedStockMovement_clientId_productId_createdAt_idx"
  ON "ConsignedStockMovement"("clientId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsignedStockMovement_referenceType_referenceId_idx" ON "ConsignedStockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_visitCode_key" ON "Visit"("visitCode");

-- CreateIndex
CREATE INDEX "Visit_clientId_visitedAt_idx" ON "Visit"("clientId", "visitedAt");

-- CreateIndex
CREATE INDEX "Visit_status_visitedAt_idx" ON "Visit"("status", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitItem_visitId_productId_key" ON "VisitItem"("visitId", "productId");

-- CreateIndex
CREATE INDEX "VisitItem_visitId_idx" ON "VisitItem"("visitId");

-- CreateIndex
CREATE INDEX "VisitItem_productId_idx" ON "VisitItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_visitId_key" ON "Receivable"("visitId");

-- CreateIndex
CREATE INDEX "Receivable_clientId_status_dueDate_idx" ON "Receivable"("clientId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Receivable_dueDate_idx" ON "Receivable"("dueDate");

-- CreateIndex
CREATE INDEX "Payment_receivableId_paidAt_idx" ON "Payment"("receivableId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptDocument_visitId_key" ON "ReceiptDocument"("visitId");

-- AddForeignKey
ALTER TABLE "ClientProduct"
  ADD CONSTRAINT "ClientProduct_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProduct"
  ADD CONSTRAINT "ClientProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentralStockBalance"
  ADD CONSTRAINT "CentralStockBalance_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentralStockMovement"
  ADD CONSTRAINT "CentralStockMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignedStockBalance"
  ADD CONSTRAINT "ConsignedStockBalance_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignedStockBalance"
  ADD CONSTRAINT "ConsignedStockBalance_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignedStockMovement"
  ADD CONSTRAINT "ConsignedStockMovement_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignedStockMovement"
  ADD CONSTRAINT "ConsignedStockMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitItem"
  ADD CONSTRAINT "VisitItem_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitItem"
  ADD CONSTRAINT "VisitItem_clientProductId_fkey"
  FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitItem"
  ADD CONSTRAINT "VisitItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable"
  ADD CONSTRAINT "Receivable_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable"
  ADD CONSTRAINT "Receivable_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_receivableId_fkey"
  FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptDocument"
  ADD CONSTRAINT "ReceiptDocument_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
