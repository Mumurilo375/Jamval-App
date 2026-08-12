-- Keep identity generation inside PostgreSQL too, not only inside Prisma Client.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "CompanyProfileSettings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Product" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Client" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ClientProduct" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "CentralStockBalance" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "CentralStockMovement" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ConsignedStockBalance" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ConsignedStockMovement" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Visit" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "VisitItem" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Receivable" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Payment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ReceiptDocument" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Movement rows are audit events and should always be attributable to a business operation.
UPDATE "CentralStockMovement"
SET "referenceId" = gen_random_uuid()
WHERE "referenceId" IS NULL;

UPDATE "ConsignedStockMovement"
SET "referenceId" = gen_random_uuid()
WHERE "referenceId" IS NULL;

ALTER TABLE "CentralStockMovement" ALTER COLUMN "referenceId" SET NOT NULL;
ALTER TABLE "ConsignedStockMovement" ALTER COLUMN "referenceId" SET NOT NULL;

-- Domain constraints not expressible in Prisma schema DSL.
ALTER TABLE "User"
  ADD CONSTRAINT "ck_user_email_lowercase"
  CHECK ("email" = lower("email")) NOT VALID;

ALTER TABLE "CompanyProfileSettings"
  ADD CONSTRAINT "ck_companyprofilesettings_singleton_default"
  CHECK ("singletonKey" = 'default') NOT VALID;

ALTER TABLE "Product"
  ADD CONSTRAINT "ck_product_baseprice_non_negative"
  CHECK ("basePrice" >= 0) NOT VALID,
  ADD CONSTRAINT "ck_product_costprice_non_negative"
  CHECK ("costPrice" IS NULL OR "costPrice" >= 0) NOT VALID;

ALTER TABLE "Client"
  ADD CONSTRAINT "ck_client_visitcycledays_positive"
  CHECK ("visitCycleDays" IS NULL OR "visitCycleDays" > 0) NOT VALID;

ALTER TABLE "ClientProduct"
  ADD CONSTRAINT "ck_clientproduct_idealquantity_non_negative"
  CHECK ("idealQuantity" IS NULL OR "idealQuantity" >= 0) NOT VALID,
  ADD CONSTRAINT "ck_clientproduct_displayorder_non_negative"
  CHECK ("displayOrder" IS NULL OR "displayOrder" >= 0) NOT VALID;

ALTER TABLE "CentralStockMovement"
  ADD CONSTRAINT "ck_centralstockmovement_unitcost_non_negative"
  CHECK ("unitCost" IS NULL OR "unitCost" >= 0) NOT VALID,
  ADD CONSTRAINT "ck_centralstockmovement_totalcost_non_negative"
  CHECK ("totalCost" IS NULL OR "totalCost" >= 0) NOT VALID,
  ADD CONSTRAINT "ck_centralstockmovement_cost_pair"
  CHECK (
    ("unitCost" IS NULL AND "totalCost" IS NULL) OR
    ("unitCost" IS NOT NULL AND "totalCost" IS NOT NULL)
  ) NOT VALID,
  ADD CONSTRAINT "ck_centralstockmovement_totalcost_consistency"
  CHECK ("unitCost" IS NULL OR "totalCost" = ("unitCost" * "quantity")) NOT VALID,
  ADD CONSTRAINT "ck_centralstockmovement_entry_cost_required"
  CHECK (
    "movementType" NOT IN ('INITIAL_LOAD', 'MANUAL_ENTRY') OR
    ("unitCost" IS NOT NULL AND "totalCost" IS NOT NULL)
  ) NOT VALID;

ALTER TABLE "Visit"
  ADD CONSTRAINT "ck_visit_cancelled_without_completedat"
  CHECK ("status" <> 'CANCELLED' OR "completedAt" IS NULL) NOT VALID,
  ADD CONSTRAINT "ck_visit_pending_signature_without_signature_fields"
  CHECK (
    "signatureStatus" <> 'PENDING' OR
    ("signatureName" IS NULL AND "signatureImageKey" IS NULL AND "signedAt" IS NULL)
  ) NOT VALID;

ALTER TABLE "VisitItem"
  ADD CONSTRAINT "ck_visititem_costpricesnapshot_non_negative"
  CHECK ("costPriceSnapshot" IS NULL OR "costPriceSnapshot" >= 0) NOT VALID;

ALTER TABLE "Receivable"
  ADD CONSTRAINT "ck_receivable_status_matches_amounts"
  CHECK (
    ("status" = 'PAID' AND "amountOutstanding" = 0) OR
    ("status" = 'PARTIAL' AND "amountReceived" > 0 AND "amountOutstanding" > 0) OR
    ("status" = 'PENDING' AND "amountReceived" = 0 AND "amountOutstanding" = "originalAmount")
  ) NOT VALID;

-- Business uniqueness and query indexes.
CREATE UNIQUE INDEX "Visit_one_draft_per_client_idx"
  ON "Visit"("clientId")
  WHERE "status" = 'DRAFT';

CREATE UNIQUE INDEX "User_email_lower_key"
  ON "User"(lower("email"));

CREATE UNIQUE INDEX "Product_sku_lower_key"
  ON "Product"(lower("sku"));

CREATE UNIQUE INDEX "Client_documentNumber_key"
  ON "Client"("documentNumber")
  WHERE "documentNumber" IS NOT NULL;

CREATE UNIQUE INDEX "ReceiptDocument_storageKey_key"
  ON "ReceiptDocument"("storageKey");

CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX "Receivable_status_dueDate_idx" ON "Receivable"("status", "dueDate");
CREATE INDEX "Visit_status_completedAt_idx" ON "Visit"("status", "completedAt");

CREATE INDEX "CentralStockMovement_entry_cost_lookup_idx"
  ON "CentralStockMovement"("productId", "createdAt" DESC)
  WHERE "movementType" IN ('INITIAL_LOAD', 'MANUAL_ENTRY') AND "unitCost" IS NOT NULL;

CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX "Client_tradeName_trgm_idx" ON "Client" USING GIN ("tradeName" gin_trgm_ops);
CREATE INDEX "Client_legalName_trgm_idx" ON "Client" USING GIN ("legalName" gin_trgm_ops);
CREATE INDEX "Client_documentNumber_trgm_idx" ON "Client" USING GIN ("documentNumber" gin_trgm_ops);
