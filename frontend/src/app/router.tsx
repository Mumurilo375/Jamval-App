import { createBrowserRouter, Navigate } from "react-router-dom";

import { DashboardPage } from "../features/dashboard/dashboard-page";
import { PublicOnlyRoute, ProtectedApp } from "../features/auth/route-guards";
import { LoginPage } from "../features/auth/login-page";
import { CadastrosPage } from "../features/cadastros/cadastros-page";
import { CatalogCreatePage } from "../features/client-catalog/catalog-create-page";
import { CatalogEditPage } from "../features/client-catalog/catalog-edit-page";
import { CatalogListPage } from "../features/client-catalog/catalog-list-page";
import { ClientCreatePage } from "../features/clients/client-create-page";
import { ClientEditPage } from "../features/clients/client-edit-page";
import { ClientsListPage } from "../features/clients/clients-list-page";
import { MorePage } from "../features/more/more-page";
import { PendingPage } from "../features/pending/pending-page";
import { ProductCreatePage } from "../features/products/product-create-page";
import { ProductEditPage } from "../features/products/product-edit-page";
import { ProductsListPage } from "../features/products/products-list-page";
import { VisitCreatePage } from "../features/visits/visit-create-page";
import { VisitDetailPage } from "../features/visits/visit-detail-page";
import { VisitEditPage } from "../features/visits/visit-edit-page";
import { VisitItemCreatePage } from "../features/visits/visit-item-create-page";
import { VisitItemEditPage } from "../features/visits/visit-item-edit-page";
import { VisitsListPage } from "../features/visits/visits-list-page";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />
      }
    ]
  },
  {
    path: "/",
    element: <ProtectedApp />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: "/pendencias",
        element: <PendingPage />
      },
      {
        path: "/cadastros",
        element: <CadastrosPage />
      },
      {
        path: "/mais",
        element: <MorePage />
      },
      {
        path: "/products",
        element: <ProductsListPage />
      },
      {
        path: "/products/new",
        element: <ProductCreatePage />
      },
      {
        path: "/products/:productId/edit",
        element: <ProductEditPage />
      },
      {
        path: "/clients",
        element: <ClientsListPage />
      },
      {
        path: "/clients/new",
        element: <ClientCreatePage />
      },
      {
        path: "/clients/:clientId/edit",
        element: <ClientEditPage />
      },
      {
        path: "/clients/:clientId/catalog",
        element: <CatalogListPage />
      },
      {
        path: "/clients/:clientId/catalog/new",
        element: <CatalogCreatePage />
      },
      {
        path: "/clients/:clientId/catalog/:clientProductId/edit",
        element: <CatalogEditPage />
      },
      {
        path: "/visits",
        element: <VisitsListPage />
      },
      {
        path: "/visits/new",
        element: <VisitCreatePage />
      },
      {
        path: "/visits/:visitId",
        element: <VisitDetailPage />
      },
      {
        path: "/visits/:visitId/edit",
        element: <VisitEditPage />
      },
      {
        path: "/visits/:visitId/items/new",
        element: <VisitItemCreatePage />
      },
      {
        path: "/visits/:visitId/items/:itemId/edit",
        element: <VisitItemEditPage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
