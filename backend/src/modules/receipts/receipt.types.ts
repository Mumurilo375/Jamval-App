import type { Prisma } from "@prisma/client";

export type VisitReceiptSource = Prisma.VisitGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        tradeName: true;
        legalName: true;
        documentNumber: true;
        contactName: true;
        phone: true;
        addressLine: true;
        addressCity: true;
        addressState: true;
        addressZipcode: true;
      };
    };
    items: {
      orderBy: {
        createdAt: "asc";
      };
    };
    receivable: {
      include: {
        payments: {
          orderBy: [
            {
              paidAt: "asc";
            },
            {
              createdAt: "asc";
            }
          ];
        };
      };
    };
  };
}>;

export type ReceiptDocumentWithVisitSummary = Prisma.ReceiptDocumentGetPayload<{
  include: {
    visit: {
      select: {
        id: true;
        visitCode: true;
        status: true;
        visitedAt: true;
        totalAmount: true;
        receivedAmountOnVisit: true;
        signatureStatus: true;
        signedAt: true;
        client: {
          select: {
            id: true;
            tradeName: true;
          };
        };
      };
    };
  };
}>;
