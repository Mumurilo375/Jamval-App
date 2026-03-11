import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PageLoader } from "../../components/ui";
import { MobileShell } from "../../components/shell";
import { useAuthSession } from "./auth";

export function ProtectedApp() {
  const location = useLocation();
  const sessionQuery = useAuthSession();

  if (sessionQuery.isPending) {
    return <PageLoader label="Validando sessao..." />;
  }

  if (sessionQuery.error) {
    return <PageLoader label="Nao foi possivel validar a sessao." />;
  }

  if (!sessionQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <MobileShell />;
}

export function PublicOnlyRoute() {
  const sessionQuery = useAuthSession();

  if (sessionQuery.isPending) {
    return <PageLoader label="Abrindo Jamval..." />;
  }

  if (sessionQuery.data) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
