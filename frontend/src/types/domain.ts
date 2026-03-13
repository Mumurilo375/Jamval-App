export type AuthUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  voltage: string | null;
  connectorType: string | null;
  basePrice: number;
  costPrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  tradeName: string;
  legalName: string | null;
  documentNumber: string | null;
  stateRegistration: string | null;
  contactName: string | null;
  phone: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipcode: string | null;
  notes: string | null;
  visitCycleDays: number | null;
  requiresInvoice: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientProduct = {
  id: string;
  clientId: string;
  productId: string;
  currentUnitPrice: number;
  idealQuantity: number | null;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client: Client;
  product: Product;
};

export type VisitStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type SignatureStatus = "PENDING" | "SIGNED";

export type Visit = {
  id: string;
  visitCode: string;
  clientId: string;
  status: VisitStatus;
  visitedAt: string;
  notes: string | null;
  totalAmount: number;
  receivedAmountOnVisit: number;
  dueDate: string | null;
  signatureStatus: SignatureStatus;
  signatureName: string | null;
  signatureImageKey: string | null;
  signedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitItem = {
  id: string;
  visitId: string;
  clientProductId: string | null;
  productId: string;
  productSnapshotName: string;
  productSnapshotSku: string;
  productSnapshotLabel: string;
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  quantitySold: number;
  unitPrice: number;
  subtotalAmount: number;
  suggestedRestockQuantity: number;
  restockedQuantity: number;
  resultingClientQuantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitDetail = Visit & {
  items: VisitItem[];
};
