-- CreateTable
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "email" VARCHAR(200) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sessionTokenHash" VARCHAR(128),
  "sessionExpiresAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionTokenHash_key" ON "User"("sessionTokenHash");
