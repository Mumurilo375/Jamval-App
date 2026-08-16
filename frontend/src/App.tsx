import { Component, type ErrorInfo, type ReactNode } from "react";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./app/providers";
import { router } from "./app/router";

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Falha inesperada ao renderizar o Jamval", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--jam-bg)] px-4 py-8 text-[var(--jam-ink)]">
          <section className="w-full max-w-[440px] rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jam-danger)]">Falha inesperada</p>
            <h1 className="mt-2 font-display text-xl font-semibold">Não foi possível abrir esta tela</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--jam-subtle)]">
              Tente novamente. Se o problema continuar, atualize a página e confira sua conexão.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--jam-accent)] px-4 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--jam-focus-ring)]"
            >
              Tentar novamente
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  );
}

export default App;
