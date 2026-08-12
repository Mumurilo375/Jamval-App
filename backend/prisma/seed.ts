import {
  CentralStockMovementType,
  ConsignedStockMovementType,
  PaymentMethod,
  ReceivableStatus,
  StockReferenceType,
  VisitStatus,
  type Client,
  type ClientProduct,
  type Product
} from "@prisma/client";

import { computeDraftVisitItem, ensureReceivedAmountWithinTotal } from "../src/modules/visits/visit.validators";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_TAG = "[seed:jamval-dev:v1]";

type ProductSeed = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  model?: string;
  color?: string;
  voltage?: string;
  connectorType?: string;
  basePrice: number;
  costPrice?: number;
};

type ClientSeed = {
  key: string;
  tradeName: string;
  legalName: string;
  documentNumber: string;
  stateRegistration?: string;
  contactName: string;
  phone: string;
  addressLine: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  notes: string;
  visitCycleDays: number;
  requiresInvoice: boolean;
};

type ClientCatalogSeed = {
  sku: string;
  currentUnitPrice: number;
  idealQuantity: number;
  displayOrder: number;
  isActive?: boolean;
};

type VisitItemSeed = {
  sku: string;
  quantityPrevious: number;
  quantityGoodRemaining: number;
  quantityDefectiveReturn: number;
  quantityLoss: number;
  suggestedRestockQuantity: number;
  restockedQuantity: number;
  notes?: string;
};

type VisitSeed = {
  visitCode: string;
  clientKey: string;
  visitedAt: string;
  receivedAmountOnVisit: number;
  dueDate?: string;
  notes: string;
  items: VisitItemSeed[];
};

type CompletedVisitSeed = VisitSeed & {
  visitType: "CONSIGNMENT" | "SALE";
  payments: Array<{ amount: number; method: PaymentMethod; paidAt: string; reference?: string }>;
};

const productSeeds: ProductSeed[] = [
  {
    sku: "JMV-CABO-USBC-1M-BK",
    name: "Cabo USB-C 1m",
    category: "Cabos",
    brand: "Inova",
    model: "Fast Sync",
    color: "Preto",
    connectorType: "USB-C",
    basePrice: 18.9,
    costPrice: 10.4
  },
  {
    sku: "JMV-CABO-LIGHT-1M-WH",
    name: "Cabo Lightning 1m",
    category: "Cabos",
    brand: "Hrebos",
    model: "Premium",
    color: "Branco",
    connectorType: "Lightning",
    basePrice: 22.5,
    costPrice: 12.9
  },
  {
    sku: "JMV-CARREG-20W-USBC",
    name: "Carregador Turbo 20W",
    category: "Carregadores",
    brand: "Kaidi",
    model: "PD 20W",
    color: "Branco",
    voltage: "Bivolt",
    connectorType: "USB-C",
    basePrice: 34.9,
    costPrice: 20.6
  },
  {
    sku: "JMV-FONTE-12V-2A-P4",
    name: "Fonte 12V 2A",
    category: "Fontes",
    brand: "Multcomercial",
    model: "P4",
    color: "Preto",
    voltage: "12V",
    connectorType: "P4",
    basePrice: 27.4,
    costPrice: 15.8
  },
  {
    sku: "JMV-FONE-P2-ESTEREO",
    name: "Fone Intra Auricular P2",
    category: "Áudio",
    brand: "Lehmox",
    model: "LEF-102",
    color: "Preto",
    connectorType: "P2",
    basePrice: 16.8
  },
  {
    sku: "JMV-ADAPT-USBC-P2",
    name: "Adaptador USB-C para P2",
    category: "Adaptadores",
    brand: "Exbom",
    model: "UC-AUX",
    color: "Cinza",
    connectorType: "USB-C",
    basePrice: 14.7,
    costPrice: 8.1
  },
  {
    sku: "JMV-CARREG-VEIC-2USB",
    name: "Carregador Veicular Duplo USB",
    category: "Carregadores",
    brand: "It-Blue",
    model: "CV-210",
    color: "Preto",
    voltage: "12V/24V",
    connectorType: "USB-A",
    basePrice: 21.3,
    costPrice: 12.4
  },
  {
    sku: "JMV-POWERBANK-10K",
    name: "Power Bank 10000mAh",
    category: "Baterias",
    brand: "Pineng",
    model: "PN-951",
    color: "Preto",
    connectorType: "USB-C",
    basePrice: 79.9,
    costPrice: 52.3
  },
  {
    sku: "JMV-CABO-USBC-2M-RD",
    name: "Cabo USB-C 2m Reforçado",
    category: "Cabos",
    brand: "Hrebos",
    model: "Nylon 2m",
    color: "Vermelho",
    connectorType: "USB-C",
    basePrice: 29.9,
    costPrice: 16.7
  },
  {
    sku: "JMV-CABO-MICRO-1M-BK",
    name: "Cabo Micro USB 1m",
    category: "Cabos",
    brand: "Inova",
    model: "Fast Sync",
    color: "Preto",
    connectorType: "Micro USB",
    basePrice: 15.9,
    costPrice: 8.4
  },
  {
    sku: "JMV-CARREG-33W-USBC",
    name: "Carregador Turbo 33W",
    category: "Carregadores",
    brand: "Xtrad",
    model: "PD 33W",
    color: "Branco",
    voltage: "Bivolt",
    connectorType: "USB-C",
    basePrice: 54.9,
    costPrice: 31.5
  },
  {
    sku: "JMV-FONE-BT-TWS-BK",
    name: "Fone Bluetooth TWS",
    category: "Áudio",
    brand: "H'Maston",
    model: "TW-12",
    color: "Preto",
    connectorType: "Bluetooth",
    basePrice: 64.9,
    costPrice: 37.8
  },
  {
    sku: "JMV-SUPORTE-VEIC-MAG",
    name: "Suporte Veicular Magnético",
    category: "Suportes",
    brand: "Exbom",
    model: "SP-MAG",
    color: "Preto",
    basePrice: 32.9,
    costPrice: 18.6
  },
  {
    sku: "JMV-PEL-3D-IP13",
    name: "Película 3D iPhone 13",
    category: "Películas",
    brand: "HPrime",
    model: "3D",
    color: "Transparente",
    basePrice: 19.9,
    costPrice: 7.2
  },
  {
    sku: "JMV-CAIXA-BT-MINI",
    name: "Caixa de Som Bluetooth Mini",
    category: "Áudio",
    brand: "Altomex",
    model: "AL-203",
    color: "Azul",
    connectorType: "Bluetooth",
    basePrice: 69.9,
    costPrice: 41.9
  },
  {
    sku: "JMV-ADAPT-OTG-USBC",
    name: "Adaptador OTG USB-C",
    category: "Adaptadores",
    brand: "Basike",
    model: "OTG-C",
    color: "Prata",
    connectorType: "USB-C",
    basePrice: 17.9,
    costPrice: 9.4
  },
  {
    sku: "JMV-LUMINARIA-USB",
    name: "Luminária LED USB",
    category: "Utilidades",
    brand: "Kapbom",
    model: "KA-601",
    color: "Branco",
    connectorType: "USB-A",
    basePrice: 24.9,
    costPrice: 13.2
  },
  {
    sku: "JMV-CARREG-VEIC-PD",
    name: "Carregador Veicular PD 30W",
    category: "Carregadores",
    brand: "Kaidi",
    model: "KD-511",
    color: "Preto",
    voltage: "12V/24V",
    connectorType: "USB-C",
    basePrice: 39.9,
    costPrice: 22.8
  }
];

const clientSeeds: ClientSeed[] = [
  {
    key: "mercado-nova-esperanca",
    tradeName: "Mercado Nova Esperança",
    legalName: "Mercado Nova Esperança Ltda",
    documentNumber: "12.345.678/0001-01",
    stateRegistration: "345667890",
    contactName: "Paulo Roberto",
    phone: "(81) 99811-2201",
    addressLine: "Rua da Feira, 120",
    addressCity: "Caruaru",
    addressState: "PE",
    addressZipcode: "55002-120",
    notes: "Mercado de bairro com giro forte de cabos e carregadores de tomada.",
    visitCycleDays: 7,
    requiresInvoice: false
  },
  {
    key: "loja-conecta-cell",
    tradeName: "Conecta Cell Acessórios",
    legalName: "Conecta Cell Comércio de Eletrônicos Ltda",
    documentNumber: "22.456.789/0001-02",
    stateRegistration: "456778901",
    contactName: "Larissa Gomes",
    phone: "(81) 99773-1144",
    addressLine: "Av. Agamenon, 450",
    addressCity: "Caruaru",
    addressState: "PE",
    addressZipcode: "55012-340",
    notes: "Loja especializada em acessórios; aceita mix maior e reposição semanal.",
    visitCycleDays: 7,
    requiresInvoice: true
  },
  {
    key: "lanchonete-sabor-praca",
    tradeName: "Lanchonete Sabor da Praça",
    legalName: "Sabor da Praça Alimentos Ltda",
    documentNumber: "33.567.890/0001-03",
    contactName: "Marcos Vinicius",
    phone: "(81) 99121-8787",
    addressLine: "Praça do Rosário, 18",
    addressCity: "Bezerros",
    addressState: "PE",
    addressZipcode: "55660-000",
    notes: "Ponto de alimentação com saída baixa de fones e carregadores veiculares.",
    visitCycleDays: 14,
    requiresInvoice: false
  },
  {
    key: "conveniencia-ponto-24h",
    tradeName: "Conveniência Ponto 24h",
    legalName: "Ponto 24h Conveniência Ltda",
    documentNumber: "44.678.901/0001-04",
    contactName: "Camila Duarte",
    phone: "(81) 98845-6622",
    addressLine: "BR-232 Km 74, Posto Sol",
    addressCity: "Gravatá",
    addressState: "PE",
    addressZipcode: "55645-000",
    notes: "Conveniência de posto com venda boa de cabos, power bank e carregador veicular.",
    visitCycleDays: 10,
    requiresInvoice: false
  },
  {
    key: "papelaria-central-mix",
    tradeName: "Papelaria Central Mix",
    legalName: "Central Mix Papelaria e Utilidades Ltda",
    documentNumber: "55.789.012/0001-05",
    contactName: "Silvana Melo",
    phone: "(81) 99652-4400",
    addressLine: "Rua João Pessoa, 89",
    addressCity: "Santa Cruz do Capibaribe",
    addressState: "PE",
    addressZipcode: "55190-000",
    notes: "Ponto comercial diverso com mix menor e reposição conforme demanda local.",
    visitCycleDays: 15,
    requiresInvoice: true
  }
];

const additionalClientRows: Array<[string, string, string, number, boolean]> = [
    ["farmacia-bom-preco", "Farmácia Bom Preço", "Recife", 10, true],
    ["banca-do-centro", "Banca do Centro", "Caruaru", 7, false],
    ["mercadinho-sao-joao", "Mercadinho São João", "Toritama", 14, false],
    ["tech-point-acessorios", "Tech Point Acessórios", "Recife", 7, true],
    ["posto-estrada-real", "Posto Estrada Real", "Gravatá", 10, false],
    ["variedades-martins", "Variedades Martins", "Bezerros", 15, false],
    ["conveniencia-boa-viagem", "Conveniência Boa Viagem", "Recife", 7, true]
];

clientSeeds.push(
  ...additionalClientRows.map(([key, tradeName, city, visitCycleDays, requiresInvoice], index) => ({
    key,
    tradeName,
    legalName: `${tradeName} Comércio Ltda`,
    documentNumber: `90.123.45${index}/0001-${String(index + 10).padStart(2, "0")}`,
    contactName: ["Aline", "Rogério", "Joana", "Diego", "Fernanda", "Carlos", "Patrícia"][index],
    phone: `(81) 99${810 + index}-${2200 + index}`,
    addressLine: `Rua Comercial, ${50 + index * 17}`,
    addressCity: city,
    addressState: "PE",
    addressZipcode: `50${100 + index}-000`,
    notes: "Cliente fictício criado para demonstração do sistema.",
    visitCycleDays,
    requiresInvoice
  }))
);

const clientCatalogSeeds: Record<string, ClientCatalogSeed[]> = {
  "mercado-nova-esperanca": [
    { sku: "JMV-CABO-USBC-1M-BK", currentUnitPrice: 21.9, idealQuantity: 12, displayOrder: 1 },
    { sku: "JMV-CARREG-20W-USBC", currentUnitPrice: 39.9, idealQuantity: 8, displayOrder: 2 },
    { sku: "JMV-CARREG-VEIC-2USB", currentUnitPrice: 24.9, idealQuantity: 5, displayOrder: 3 },
    { sku: "JMV-FONE-P2-ESTEREO", currentUnitPrice: 19.9, idealQuantity: 6, displayOrder: 4 }
  ],
  "loja-conecta-cell": [
    { sku: "JMV-CABO-USBC-1M-BK", currentUnitPrice: 23.9, idealQuantity: 20, displayOrder: 1 },
    { sku: "JMV-CABO-LIGHT-1M-WH", currentUnitPrice: 28.9, idealQuantity: 15, displayOrder: 2 },
    { sku: "JMV-CARREG-20W-USBC", currentUnitPrice: 42.9, idealQuantity: 12, displayOrder: 3 },
    { sku: "JMV-ADAPT-USBC-P2", currentUnitPrice: 18.9, idealQuantity: 10, displayOrder: 4 },
    { sku: "JMV-POWERBANK-10K", currentUnitPrice: 94.9, idealQuantity: 6, displayOrder: 5 }
  ],
  "lanchonete-sabor-praca": [
    { sku: "JMV-FONE-P2-ESTEREO", currentUnitPrice: 18.5, idealQuantity: 4, displayOrder: 1 },
    { sku: "JMV-CARREG-VEIC-2USB", currentUnitPrice: 25.9, idealQuantity: 3, displayOrder: 2 },
    { sku: "JMV-FONTE-12V-2A-P4", currentUnitPrice: 32.9, idealQuantity: 2, displayOrder: 3 }
  ],
  "conveniencia-ponto-24h": [
    { sku: "JMV-CABO-USBC-1M-BK", currentUnitPrice: 24.5, idealQuantity: 10, displayOrder: 1 },
    { sku: "JMV-CARREG-VEIC-2USB", currentUnitPrice: 26.9, idealQuantity: 8, displayOrder: 2 },
    { sku: "JMV-POWERBANK-10K", currentUnitPrice: 99.9, idealQuantity: 4, displayOrder: 3 },
    { sku: "JMV-CARREG-20W-USBC", currentUnitPrice: 41.5, idealQuantity: 6, displayOrder: 4 }
  ],
  "papelaria-central-mix": [
    { sku: "JMV-CABO-LIGHT-1M-WH", currentUnitPrice: 29.9, idealQuantity: 5, displayOrder: 1 },
    { sku: "JMV-ADAPT-USBC-P2", currentUnitPrice: 17.9, idealQuantity: 4, displayOrder: 2 },
    { sku: "JMV-FONTE-12V-2A-P4", currentUnitPrice: 31.9, idealQuantity: 3, displayOrder: 3 },
    { sku: "JMV-FONE-P2-ESTEREO", currentUnitPrice: 18.9, idealQuantity: 4, displayOrder: 4 }
  ]
};

const visitSeeds: VisitSeed[] = [
  {
    visitCode: "SEED-VIS-20260311-001",
    clientKey: "mercado-nova-esperanca",
    visitedAt: "2026-03-08T14:30:00.000Z",
    receivedAmountOnVisit: 43.8,
    dueDate: "2026-03-20",
    notes: "Conferência parcial de domingo com reposição de cabos e carregadores.",
    items: [
      {
        sku: "JMV-CABO-USBC-1M-BK",
        quantityPrevious: 12,
        quantityGoodRemaining: 4,
        quantityDefectiveReturn: 1,
        quantityLoss: 0,
        suggestedRestockQuantity: 8,
        restockedQuantity: 7,
        notes: "Ponta do mostruário próxima ao caixa."
      },
      {
        sku: "JMV-CARREG-20W-USBC",
        quantityPrevious: 8,
        quantityGoodRemaining: 3,
        quantityDefectiveReturn: 0,
        quantityLoss: 1,
        suggestedRestockQuantity: 6,
        restockedQuantity: 5
      },
      {
        sku: "JMV-CARREG-VEIC-2USB",
        quantityPrevious: 5,
        quantityGoodRemaining: 2,
        quantityDefectiveReturn: 0,
        quantityLoss: 0,
        suggestedRestockQuantity: 3,
        restockedQuantity: 3
      }
    ]
  },
  {
    visitCode: "SEED-VIS-20260311-002",
    clientKey: "loja-conecta-cell",
    visitedAt: "2026-03-09T10:15:00.000Z",
    receivedAmountOnVisit: 0,
    dueDate: "2026-03-25",
    notes: "Loja pediu reforço em power bank e manteve Lightning com preço promocional da semana.",
    items: [
      {
        sku: "JMV-CABO-LIGHT-1M-WH",
        quantityPrevious: 15,
        quantityGoodRemaining: 6,
        quantityDefectiveReturn: 1,
        quantityLoss: 0,
        suggestedRestockQuantity: 9,
        restockedQuantity: 8
      },
      {
        sku: "JMV-ADAPT-USBC-P2",
        quantityPrevious: 10,
        quantityGoodRemaining: 5,
        quantityDefectiveReturn: 0,
        quantityLoss: 0,
        suggestedRestockQuantity: 5,
        restockedQuantity: 5
      },
      {
        sku: "JMV-POWERBANK-10K",
        quantityPrevious: 6,
        quantityGoodRemaining: 2,
        quantityDefectiveReturn: 0,
        quantityLoss: 0,
        suggestedRestockQuantity: 4,
        restockedQuantity: 3,
        notes: "Cliente pediu reposição menor por causa do capital parado."
      }
    ]
  },
  {
    visitCode: "SEED-VIS-20260311-003",
    clientKey: "conveniencia-ponto-24h",
    visitedAt: "2026-03-10T18:45:00.000Z",
    receivedAmountOnVisit: 26.9,
    notes: "Visita no fim da tarde com ajuste por perda de uma peça no expositor.",
    items: [
      {
        sku: "JMV-CABO-USBC-1M-BK",
        quantityPrevious: 10,
        quantityGoodRemaining: 3,
        quantityDefectiveReturn: 0,
        quantityLoss: 1,
        suggestedRestockQuantity: 7,
        restockedQuantity: 6
      },
      {
        sku: "JMV-CARREG-VEIC-2USB",
        quantityPrevious: 8,
        quantityGoodRemaining: 5,
        quantityDefectiveReturn: 1,
        quantityLoss: 0,
        suggestedRestockQuantity: 4,
        restockedQuantity: 4
      },
      {
        sku: "JMV-POWERBANK-10K",
        quantityPrevious: 4,
        quantityGoodRemaining: 3,
        quantityDefectiveReturn: 0,
        quantityLoss: 0,
        suggestedRestockQuantity: 1,
        restockedQuantity: 1
      }
    ]
  }
];

const completedVisitSeeds: CompletedVisitSeed[] = [
  ["mercado-nova-esperanca", "JMV-CABO-USBC-1M-BK", "CONSIGNMENT", 10, 3, 7, 43.8, "PIX"],
  ["loja-conecta-cell", "JMV-CABO-LIGHT-1M-WH", "CONSIGNMENT", 15, 6, 9, 0, "PIX"],
  ["conveniencia-ponto-24h", "JMV-CARREG-VEIC-2USB", "CONSIGNMENT", 8, 4, 5, 26.9, "CASH"],
  ["lanchonete-sabor-praca", "JMV-FONE-P2-ESTEREO", "CONSIGNMENT", 6, 2, 4, 18.5, "CARD"],
  ["papelaria-central-mix", "JMV-ADAPT-USBC-P2", "CONSIGNMENT", 7, 3, 4, 0, "BANK_TRANSFER"],
  ["farmacia-bom-preco", "JMV-CABO-USBC-1M-BK", "CONSIGNMENT", 9, 5, 5, 45.8, "PIX"],
  ["banca-do-centro", "JMV-CARREG-20W-USBC", "CONSIGNMENT", 6, 2, 4, 79.8, "CASH"],
  ["mercadinho-sao-joao", "JMV-FONE-BT-TWS-BK", "CONSIGNMENT", 4, 1, 3, 74.9, "PIX"],
  ["tech-point-acessorios", "JMV-CABO-USBC-1M-BK", "SALE", 7, 0, 0, 120, "CARD"],
  ["posto-estrada-real", "JMV-CARREG-VEIC-PD", "SALE", 5, 0, 0, 89.8, "PIX"],
  ["variedades-martins", "JMV-PEL-3D-IP13", "CONSIGNMENT", 12, 7, 5, 22.9, "CASH"],
  ["conveniencia-boa-viagem", "JMV-SUPORTE-VEIC-MAG", "CONSIGNMENT", 8, 2, 6, 73.8, "PIX"],
  ["mercado-nova-esperanca", "JMV-CARREG-20W-USBC", "CONSIGNMENT", 8, 3, 5, 39.9, "PIX"],
  ["loja-conecta-cell", "JMV-POWERBANK-10K", "CONSIGNMENT", 6, 3, 3, 0, "BANK_TRANSFER"]
].map(([clientKey, sku, visitType, quantityPrevious, quantityGoodRemaining, restockedQuantity, payment, method], index) => {
  const sold = visitType === "SALE" ? quantityPrevious : quantityPrevious - quantityGoodRemaining;
  const partialPayment = index % 4 === 0 ? Math.min(payment, 20) : payment;
  const visitedAt = daysAgo(42 - index * 3);

  return {
    visitCode: `SEED-VIS-HIST-${String(index + 1).padStart(3, "0")}`,
    clientKey,
    visitType,
    visitedAt,
    receivedAmountOnVisit: partialPayment,
    dueDate: dateOnly(daysAgo(8 - index)),
    notes: `Visita fictícia de demonstração #${index + 1}, com ${sold} unidade(s) vendida(s).`,
    items: [
      {
        sku,
        quantityPrevious,
        quantityGoodRemaining: visitType === "SALE" ? 0 : quantityGoodRemaining,
        quantityDefectiveReturn: index === 2 ? 1 : 0,
        quantityLoss: index === 5 ? 1 : 0,
        suggestedRestockQuantity: restockedQuantity,
        restockedQuantity,
        notes: index === 2 ? "Devolução de item com defeito registrada para demonstração." : undefined
      }
    ],
    payments:
      partialPayment > 0
        ? [{ amount: partialPayment, method, paidAt: visitedAt, reference: `SEED-PG-${index + 1}` }]
        : []
  };
});

async function main(): Promise<void> {
  await removePreviousSeedData();
  const productsBySku = await seedProducts();
  const clientsByKey = await seedClients();
  const clientProductsByKey = await seedClientCatalogs(productsBySku, clientsByKey);

  await seedCentralStock(productsBySku);
  await seedCompletedVisits(productsBySku, clientsByKey, clientProductsByKey);
  await seedDraftVisits(productsBySku, clientsByKey, clientProductsByKey);

  console.log(
    `Seed concluído: ${productsBySku.size} produtos, ${clientsByKey.size} clientes, ${completedVisitSeeds.length} visitas concluídas e ${visitSeeds.length} rascunhos.`
  );
}

async function removePreviousSeedData(): Promise<void> {
  const visits = await prisma.visit.findMany({
    where: { visitCode: { startsWith: "SEED-VIS-" } },
    select: { id: true }
  });
  const visitIds = visits.map((visit) => visit.id);

  if (visitIds.length > 0) {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { receivable: { visitId: { in: visitIds } } } }),
      prisma.receiptDocument.deleteMany({ where: { visitId: { in: visitIds } } }),
      prisma.receivable.deleteMany({ where: { visitId: { in: visitIds } } }),
      prisma.consignedStockMovement.deleteMany({ where: { referenceType: "VISIT", referenceId: { in: visitIds } } }),
      prisma.centralStockMovement.deleteMany({ where: { referenceType: "VISIT", referenceId: { in: visitIds } } }),
      prisma.visitItem.deleteMany({ where: { visitId: { in: visitIds } } }),
      prisma.visit.deleteMany({ where: { id: { in: visitIds } } })
    ]);
  }

  const seededProducts = await prisma.product.findMany({
    where: { sku: { in: productSeeds.map((product) => product.sku) } },
    select: { id: true }
  });
  const productIds = seededProducts.map((product) => product.id);

  if (productIds.length > 0) {
    await prisma.$transaction([
      prisma.centralStockMovement.deleteMany({ where: { productId: { in: productIds }, note: { contains: SEED_TAG } } }),
      prisma.centralStockBalance.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.consignedStockBalance.deleteMany({ where: { productId: { in: productIds } } })
    ]);
  }
}

async function seedProducts(): Promise<Map<string, Product>> {
  const entries = await Promise.all(
    productSeeds.map(async (seed) => {
      const product = await prisma.product.upsert({
        where: { sku: seed.sku },
        update: {
          name: seed.name,
          category: seed.category,
          brand: seed.brand,
          model: seed.model,
          color: seed.color,
          voltage: seed.voltage,
          connectorType: seed.connectorType,
          basePrice: seed.basePrice,
          costPrice: seed.costPrice ?? null,
          isActive: true
        },
        create: {
          sku: seed.sku,
          name: seed.name,
          category: seed.category,
          brand: seed.brand,
          model: seed.model,
          color: seed.color,
          voltage: seed.voltage,
          connectorType: seed.connectorType,
          basePrice: seed.basePrice,
          costPrice: seed.costPrice ?? null,
          isActive: true
        }
      });

      return [seed.sku, product] as const;
    })
  );

  return new Map(entries);
}

async function seedClients(): Promise<Map<string, Client>> {
  const entries = await Promise.all(
    clientSeeds.map(async (seed) => {
      const seedNotes = `${SEED_TAG} ${seed.notes}`;
      const existing = await prisma.client.findFirst({
        where: {
          tradeName: seed.tradeName,
          notes: { contains: SEED_TAG }
        }
      });

      const client = existing
        ? await prisma.client.update({
            where: { id: existing.id },
            data: {
              tradeName: seed.tradeName,
              legalName: seed.legalName,
              documentNumber: seed.documentNumber,
              stateRegistration: seed.stateRegistration,
              contactName: seed.contactName,
              phone: seed.phone,
              addressLine: seed.addressLine,
              addressCity: seed.addressCity,
              addressState: seed.addressState,
              addressZipcode: seed.addressZipcode,
              notes: seedNotes,
              visitCycleDays: seed.visitCycleDays,
              requiresInvoice: seed.requiresInvoice,
              isActive: true
            }
          })
        : await prisma.client.create({
            data: {
              tradeName: seed.tradeName,
              legalName: seed.legalName,
              documentNumber: seed.documentNumber,
              stateRegistration: seed.stateRegistration,
              contactName: seed.contactName,
              phone: seed.phone,
              addressLine: seed.addressLine,
              addressCity: seed.addressCity,
              addressState: seed.addressState,
              addressZipcode: seed.addressZipcode,
              notes: seedNotes,
              visitCycleDays: seed.visitCycleDays,
              requiresInvoice: seed.requiresInvoice,
              isActive: true
            }
          });

      return [seed.key, client] as const;
    })
  );

  return new Map(entries);
}

async function seedClientCatalogs(
  productsBySku: Map<string, Product>,
  clientsByKey: Map<string, Client>
): Promise<Map<string, Map<string, ClientProduct>>> {
  const clientProductsByKey = new Map<string, Map<string, ClientProduct>>();

  for (const clientKey of clientsByKey.keys()) {
    const catalogItems = clientCatalogSeeds[clientKey] ?? createDefaultCatalog(clientKey);
    const client = requireClient(clientsByKey, clientKey);
    const itemEntries = await Promise.all(
      catalogItems.map(async (item) => {
        const product = requireProduct(productsBySku, item.sku);
        const clientProduct = await prisma.clientProduct.upsert({
          where: {
            clientId_productId: {
              clientId: client.id,
              productId: product.id
            }
          },
          update: {
            currentUnitPrice: item.currentUnitPrice,
            idealQuantity: item.idealQuantity,
            displayOrder: item.displayOrder,
            isActive: item.isActive ?? true
          },
          create: {
            clientId: client.id,
            productId: product.id,
            currentUnitPrice: item.currentUnitPrice,
            idealQuantity: item.idealQuantity,
            displayOrder: item.displayOrder,
            isActive: item.isActive ?? true
          }
        });

        return [item.sku, clientProduct] as const;
      })
    );

    clientProductsByKey.set(clientKey, new Map(itemEntries));
  }

  return clientProductsByKey;
}

async function seedCentralStock(productsBySku: Map<string, Product>): Promise<void> {
  const referenceId = crypto.randomUUID();

  for (const [index, product] of [...productsBySku.values()].entries()) {
    const quantity = 120 + (index % 5) * 35;
    const unitCost = Number(product.costPrice ?? product.basePrice);

    await prisma.centralStockBalance.upsert({
      where: { productId: product.id },
      update: { currentQuantity: quantity },
      create: { productId: product.id, currentQuantity: quantity }
    });
    await prisma.centralStockMovement.create({
      data: {
        productId: product.id,
        movementType: CentralStockMovementType.MANUAL_ENTRY,
        quantity,
        unitCost,
        totalCost: Number((quantity * unitCost).toFixed(2)),
        referenceType: StockReferenceType.MANUAL,
        referenceId,
        note: `${SEED_TAG} Entrada inicial fictícia para demonstração.`,
        createdAt: daysAgo(50)
      }
    });
  }
}

async function seedCompletedVisits(
  productsBySku: Map<string, Product>,
  clientsByKey: Map<string, Client>,
  clientProductsByKey: Map<string, Map<string, ClientProduct>>
): Promise<void> {
  for (const seed of completedVisitSeeds) {
    const client = requireClient(clientsByKey, seed.clientKey);
    const clientProducts = clientProductsByKey.get(seed.clientKey);

    if (!clientProducts) {
      throw new Error(`Catálogo não encontrado para o cliente ${seed.clientKey}.`);
    }

    await prisma.$transaction(async (tx) => {
      const visitedAt = new Date(seed.visitedAt);
      let totalAmount = 0;
      const preparedItems = seed.items.map((item) => {
        const product = requireProduct(productsBySku, item.sku);
        const clientProduct = clientProducts.get(item.sku) ?? null;
        const unitPrice = clientProduct ? Number(clientProduct.currentUnitPrice) : Number(product.basePrice);
        const computed = computeDraftVisitItem({
          product,
          clientProduct,
          clientProductId: clientProduct?.id ?? null,
          quantityPrevious: item.quantityPrevious,
          quantityGoodRemaining: seed.visitType === "SALE" ? 0 : item.quantityGoodRemaining,
          quantityDefectiveReturn: item.quantityDefectiveReturn,
          quantityLoss: item.quantityLoss,
          unitPrice,
          suggestedRestockQuantity: item.suggestedRestockQuantity,
          restockedQuantity: item.restockedQuantity,
          notes: item.notes
        });
        totalAmount += computed.subtotalAmount;
        return { product, computed };
      });
      const roundedTotal = Number(totalAmount.toFixed(2));
      const received = seed.payments.reduce((sum, payment) => sum + payment.amount, 0);
      ensureReceivedAmountWithinTotal(received, roundedTotal);

      const visit = await tx.visit.create({
        data: {
          visitCode: seed.visitCode,
          clientId: client.id,
          visitType: seed.visitType,
          status: VisitStatus.COMPLETED,
          visitedAt,
          notes: `${SEED_TAG} ${seed.notes}`,
          totalAmount: roundedTotal,
          receivedAmountOnVisit: received,
          dueDate: seed.dueDate ? new Date(`${seed.dueDate}T00:00:00.000Z`) : null,
          completedAt: visitedAt,
          signatureStatus: "SIGNED",
          signatureName: client.contactName ?? "Responsável do cliente",
          signatureImageKey: `seed-signatures/${seed.visitCode}.png`,
          signedAt: visitedAt
        }
      });

      for (const { product, computed } of preparedItems) {
        await tx.visitItem.create({
          data: { visitId: visit.id, ...computed, costPriceSnapshot: product.costPrice }
        });

        if (seed.visitType === "SALE") {
          await tx.centralStockBalance.update({ where: { productId: product.id }, data: { currentQuantity: { decrement: computed.quantitySold } } });
          await tx.centralStockMovement.create({
            data: { productId: product.id, movementType: CentralStockMovementType.DIRECT_SALE_OUT, quantity: computed.quantitySold, referenceType: StockReferenceType.VISIT, referenceId: visit.id, note: `${SEED_TAG} Venda direta ${seed.visitCode}`, createdAt: visitedAt }
          });
          continue;
        }

        await tx.consignedStockBalance.upsert({
          where: { clientId_productId: { clientId: client.id, productId: product.id } },
          update: { currentQuantity: computed.resultingClientQuantity },
          create: { clientId: client.id, productId: product.id, currentQuantity: computed.resultingClientQuantity }
        });
        for (const [movementType, quantity] of [
          [ConsignedStockMovementType.SALE_OUT, computed.quantitySold],
          [ConsignedStockMovementType.DEFECTIVE_RETURN_OUT, computed.quantityDefectiveReturn],
          [ConsignedStockMovementType.LOSS_OUT, computed.quantityLoss],
          [ConsignedStockMovementType.RESTOCK_IN, computed.restockedQuantity]
        ] as const) {
          if (quantity > 0) {
            await tx.consignedStockMovement.create({ data: { clientId: client.id, productId: product.id, movementType, quantity, referenceType: StockReferenceType.VISIT, referenceId: visit.id, note: `${SEED_TAG} Visita ${seed.visitCode}`, createdAt: visitedAt } });
          }
        }
        if (computed.restockedQuantity > 0) {
          await tx.centralStockBalance.update({ where: { productId: product.id }, data: { currentQuantity: { decrement: computed.restockedQuantity } } });
          await tx.centralStockMovement.create({ data: { productId: product.id, movementType: CentralStockMovementType.RESTOCK_TO_CLIENT, quantity: computed.restockedQuantity, referenceType: StockReferenceType.VISIT, referenceId: visit.id, note: `${SEED_TAG} Reposição ${seed.visitCode}`, createdAt: visitedAt } });
        }
        if (computed.quantityDefectiveReturn > 0) {
          await tx.centralStockMovement.create({ data: { productId: product.id, movementType: CentralStockMovementType.DEFECTIVE_RETURN_LOG, quantity: computed.quantityDefectiveReturn, referenceType: StockReferenceType.VISIT, referenceId: visit.id, note: `${SEED_TAG} Defeito ${seed.visitCode}`, createdAt: visitedAt } });
        }
      }

      const outstanding = Number((roundedTotal - received).toFixed(2));
      const status = outstanding === 0 ? ReceivableStatus.PAID : received > 0 ? ReceivableStatus.PARTIAL : ReceivableStatus.PENDING;
      const receivable = await tx.receivable.create({
        data: { visitId: visit.id, clientId: client.id, originalAmount: roundedTotal, amountReceived: received, amountOutstanding: outstanding, status, dueDate: seed.dueDate ? new Date(`${seed.dueDate}T00:00:00.000Z`) : null, issuedAt: visitedAt, settledAt: outstanding === 0 ? visitedAt : null }
      });
      for (const payment of seed.payments) {
        await tx.payment.create({ data: { receivableId: receivable.id, amount: payment.amount, paymentMethod: payment.method, reference: payment.reference, notes: `${SEED_TAG} Pagamento fictício.`, paidAt: new Date(payment.paidAt) } });
      }
    });
  }
}

function createDefaultCatalog(clientKey: string): ClientCatalogSeed[] {
  const offset = Array.from(clientKey).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
  const products = [
    ["JMV-CABO-USBC-1M-BK", 22.9],
    ["JMV-CARREG-20W-USBC", 39.9],
    ["JMV-FONE-BT-TWS-BK", 74.9],
    ["JMV-SUPORTE-VEIC-MAG", 36.9],
    ["JMV-CARREG-VEIC-PD", 44.9],
    ["JMV-PEL-3D-IP13", 22.9]
  ] as const;

  return products.slice(offset, offset + 4).map(([sku, currentUnitPrice], index) => ({
    sku,
    currentUnitPrice,
    idealQuantity: 5 + index * 3,
    displayOrder: index + 1
  }));
}

async function seedDraftVisits(
  productsBySku: Map<string, Product>,
  clientsByKey: Map<string, Client>,
  clientProductsByKey: Map<string, Map<string, ClientProduct>>
): Promise<void> {
  for (const seed of visitSeeds) {
    const client = requireClient(clientsByKey, seed.clientKey);
    const clientProducts = clientProductsByKey.get(seed.clientKey);

    if (!clientProducts) {
      throw new Error(`Catálogo não encontrado para o cliente ${seed.clientKey}.`);
    }

    const visit = await prisma.visit.upsert({
      where: { visitCode: seed.visitCode },
      update: {
        clientId: client.id,
        status: "DRAFT",
        visitedAt: new Date(seed.visitedAt),
        notes: `${SEED_TAG} ${seed.notes}`,
        receivedAmountOnVisit: 0,
        dueDate: seed.dueDate ? new Date(`${seed.dueDate}T00:00:00.000Z`) : null,
        completedAt: null,
        totalAmount: 0
      },
      create: {
        visitCode: seed.visitCode,
        clientId: client.id,
        status: "DRAFT",
        visitedAt: new Date(seed.visitedAt),
        notes: `${SEED_TAG} ${seed.notes}`,
        receivedAmountOnVisit: 0,
        dueDate: seed.dueDate ? new Date(`${seed.dueDate}T00:00:00.000Z`) : undefined,
        totalAmount: 0
      }
    });

    const desiredProductIds: string[] = [];
    let totalAmount = 0;

    for (const item of seed.items) {
      const product = requireProduct(productsBySku, item.sku);
      const clientProduct = clientProducts.get(item.sku);

      if (!clientProduct) {
        throw new Error(`ClientProduct não encontrado para ${seed.clientKey} / ${item.sku}.`);
      }

      const computedItem = computeDraftVisitItem({
        product,
        clientProduct,
        clientProductId: clientProduct.id,
        quantityPrevious: item.quantityPrevious,
        quantityGoodRemaining: item.quantityGoodRemaining,
        quantityDefectiveReturn: item.quantityDefectiveReturn,
        quantityLoss: item.quantityLoss,
        unitPrice: Number(clientProduct.currentUnitPrice),
        suggestedRestockQuantity: item.suggestedRestockQuantity,
        restockedQuantity: item.restockedQuantity,
        notes: item.notes
      });

      desiredProductIds.push(product.id);
      totalAmount += computedItem.subtotalAmount;

      await prisma.visitItem.upsert({
        where: {
          visitId_productId: {
            visitId: visit.id,
            productId: product.id
          }
        },
        update: computedItem,
        create: {
          visitId: visit.id,
          ...computedItem
        }
      });
    }

    await prisma.visitItem.deleteMany({
      where: {
        visitId: visit.id,
        productId: { notIn: desiredProductIds }
      }
    });

    const roundedTotal = Number(totalAmount.toFixed(2));
    ensureReceivedAmountWithinTotal(seed.receivedAmountOnVisit, roundedTotal);

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        totalAmount: roundedTotal,
        receivedAmountOnVisit: seed.receivedAmountOnVisit
      }
    });
  }
}

function requireProduct(productsBySku: Map<string, Product>, sku: string): Product {
  const product = productsBySku.get(sku);

  if (!product) {
    throw new Error(`Produto não encontrado no seed: ${sku}.`);
  }

  return product;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(14, 0, 0, 0);
  return date.toISOString();
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function requireClient(clientsByKey: Map<string, Client>, key: string): Client {
  const client = clientsByKey.get(key);

  if (!client) {
    throw new Error(`Cliente não encontrado no seed: ${key}.`);
  }

  return client;
}

main()
  .catch((error) => {
    console.error("Falha ao executar seed de desenvolvimento.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
