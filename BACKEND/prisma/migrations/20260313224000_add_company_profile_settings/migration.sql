CREATE TABLE "CompanyProfileSettings" (
    "id" UUID NOT NULL,
    "singletonKey" VARCHAR(32) NOT NULL DEFAULT 'default',
    "companyName" VARCHAR(200) NOT NULL,
    "document" VARCHAR(32),
    "phone" VARCHAR(32),
    "address" VARCHAR(200),
    "email" VARCHAR(160),
    "contactName" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfileSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyProfileSettings_singletonKey_key" ON "CompanyProfileSettings"("singletonKey");
