import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, ErrorBanner } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { VisitDetail } from "../../types/domain";
import { downloadVisitReceipt, generateVisitReceipt, getVisitReceipt, type VisitReceiptSummary } from "./visits-api";

type VisitReceiptCardProps = {
  visit: VisitDetail;
};

export function VisitReceiptCard({ visit }: VisitReceiptCardProps) {
  const queryClient = useQueryClient();
  const receiptQuery = useQuery({
    queryKey: ["visit-receipt", visit.id],
    queryFn: async () => {
      try {
        return await getVisitReceipt(visit.id);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: visit.status === "COMPLETED",
    retry: false
  });

  const generateMutation = useMutation({
    mutationFn: () => generateVisitReceipt(visit.id),
    onSuccess: (receipt) => {
      queryClient.setQueryData(["visit-receipt", visit.id], receipt);
    }
  });
  const downloadMutation = useMutation({
    mutationFn: (receipt: VisitReceiptSummary) => downloadVisitReceipt(receipt)
  });

  if (visit.status !== "COMPLETED") {
    return null;
  }

  const activeError = receiptQuery.error ?? generateMutation.error ?? downloadMutation.error;
  const receipt = receiptQuery.data;
  const isBusy = generateMutation.isPending || downloadMutation.isPending;
  const title = visit.visitType === "SALE" ? "Comprovante de venda direta" : "Comprovante de acerto e reposição";
  const description =
    visit.visitType === "SALE"
      ? "Gere o comprovante da venda concluída para impressão e assinatura manual em papel."
      : "Gere o comprovante da visita concluída para impressão e assinatura manual em papel.";

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--jam-subtle)]">Comprovante</p>
        <p className="mt-1 text-lg font-semibold text-[var(--jam-ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--jam-subtle)]">{description}</p>
      </div>

      {activeError instanceof ApiError ? <ErrorBanner message={activeError.message} /> : null}

      {receiptQuery.isPending ? (
        <p className="text-sm text-[var(--jam-subtle)]">Verificando se o comprovante já foi gerado...</p>
      ) : receipt ? (
        <>
          <div className="rounded-2xl bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Última geração</p>
            <p className="mt-1 text-sm font-medium text-[var(--jam-ink)]">{formatDateTime(receipt.generatedAt)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              disabled={isBusy}
              onClick={() => {
                void downloadMutation.mutateAsync(receipt);
              }}
            >
              {downloadMutation.isPending ? "Baixando..." : "Baixar comprovante"}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => {
                void generateMutation.mutateAsync();
              }}
            >
              {generateMutation.isPending ? "Gerando..." : "Gerar novamente"}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--jam-subtle)]">
            O comprovante ainda não foi gerado para esta visita concluída.
          </p>
          <Button
            className="w-full"
            disabled={isBusy}
            onClick={() => {
              void generateMutation.mutateAsync();
            }}
          >
            {generateMutation.isPending ? "Gerando..." : "Gerar comprovante"}
          </Button>
        </div>
      )}
    </Card>
  );
}
