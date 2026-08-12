-- Domain hardening constraints that are not represented natively in Prisma schema DSL.
-- This migration should run after the base table creation migration.

ALTER TABLE "ClientProduct"
  ADD CONSTRAINT "ck_clientproduct_currentunitprice_non_negative"
  CHECK ("currentUnitPrice" >= 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "ck_payment_amount_positive"
  CHECK ("amount" > 0);

ALTER TABLE "CentralStockBalance"
  ADD CONSTRAINT "ck_centralstockbalance_currentquantity_non_negative"
  CHECK ("currentQuantity" >= 0);

ALTER TABLE "CentralStockMovement"
  ADD CONSTRAINT "ck_centralstockmovement_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "ConsignedStockBalance"
  ADD CONSTRAINT "ck_consignedstockbalance_currentquantity_non_negative"
  CHECK ("currentQuantity" >= 0);

ALTER TABLE "ConsignedStockMovement"
  ADD CONSTRAINT "ck_consignedstockmovement_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "Visit"
  ADD CONSTRAINT "ck_visit_totalamount_non_negative"
  CHECK ("totalAmount" >= 0),
  ADD CONSTRAINT "ck_visit_receivedamountonvisit_non_negative"
  CHECK ("receivedAmountOnVisit" >= 0),
  ADD CONSTRAINT "ck_visit_receivedamountonvisit_lte_total"
  CHECK ("receivedAmountOnVisit" <= "totalAmount"),
  ADD CONSTRAINT "ck_visit_completed_requires_completedat"
  CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL),
  ADD CONSTRAINT "ck_visit_signed_requires_signature_fields"
  CHECK ("signatureStatus" <> 'SIGNED' OR ("signatureImageKey" IS NOT NULL AND "signedAt" IS NOT NULL));

ALTER TABLE "Receivable"
  ADD CONSTRAINT "ck_receivable_originalamount_non_negative"
  CHECK ("originalAmount" >= 0),
  ADD CONSTRAINT "ck_receivable_amountreceived_non_negative"
  CHECK ("amountReceived" >= 0),
  ADD CONSTRAINT "ck_receivable_amountoutstanding_non_negative"
  CHECK ("amountOutstanding" >= 0),
  ADD CONSTRAINT "ck_receivable_amount_consistency"
  CHECK ("amountReceived" + "amountOutstanding" = "originalAmount");

ALTER TABLE "VisitItem"
  ADD CONSTRAINT "ck_visititem_quantityprevious_non_negative"
  CHECK ("quantityPrevious" >= 0),
  ADD CONSTRAINT "ck_visititem_quantitygoodremaining_non_negative"
  CHECK ("quantityGoodRemaining" >= 0),
  ADD CONSTRAINT "ck_visititem_quantitydefectivereturn_non_negative"
  CHECK ("quantityDefectiveReturn" >= 0),
  ADD CONSTRAINT "ck_visititem_quantityloss_non_negative"
  CHECK ("quantityLoss" >= 0),
  ADD CONSTRAINT "ck_visititem_quantitysold_non_negative"
  CHECK ("quantitySold" >= 0),
  ADD CONSTRAINT "ck_visititem_unitprice_non_negative"
  CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "ck_visititem_subtotalamount_non_negative"
  CHECK ("subtotalAmount" >= 0),
  ADD CONSTRAINT "ck_visititem_suggestedrestockquantity_non_negative"
  CHECK ("suggestedRestockQuantity" >= 0),
  ADD CONSTRAINT "ck_visititem_restockedquantity_non_negative"
  CHECK ("restockedQuantity" >= 0),
  ADD CONSTRAINT "ck_visititem_resultingclientquantity_non_negative"
  CHECK ("resultingClientQuantity" >= 0),
  ADD CONSTRAINT "ck_visititem_quantity_previous_consistency"
  CHECK (
    "quantityPrevious" =
    "quantityGoodRemaining" + "quantityDefectiveReturn" + "quantityLoss" + "quantitySold"
  ),
  ADD CONSTRAINT "ck_visititem_resultingclientquantity_consistency"
  CHECK (
    "resultingClientQuantity" = "quantityGoodRemaining" + "restockedQuantity"
  ),
  ADD CONSTRAINT "ck_visititem_subtotal_consistency"
  CHECK (
    "subtotalAmount" = ("quantitySold" * "unitPrice")
  );
