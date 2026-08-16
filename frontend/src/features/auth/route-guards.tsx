import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PageLoader, RetryableErrorState } from "../../components/ui";
import { AppShell } from "../../components/shell";
import { useAuthSession } from "./auth";

export function ProtectedApp() {
  const location = useLocation();
  const sessionQuery = useAuthSession();

  if (sessionQuery.isPending) {
    return <PageLoader label="Validando sessão..." />;
  }

  if (sessionQuery.error) {
    return (
      <RetryableErrorState
        title="Não foi possível validar a sessão"
        message="Confira sua conexão e tente novamente para abrir a operação."
        onRetry={() => void sessionQuery.refetch()}
      />
    );
  }

  if (!sessionQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AppShell />;
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
