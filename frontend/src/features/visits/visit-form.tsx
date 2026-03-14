import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, PageLoader, Select, Textarea } from "../../components/ui";
import { ApiError } from "../../lib/api";
import type { Client, VisitDetail } from "../../types/domain";
import { listClients } from "../clients/clients-api";
import { createVisit, updateVisit } from "./visits-api";

const visitFormSchema = z.object({
  clientId: z.string().trim().min(1, "Selecione o cliente"),
  visitedAt: z.string(),
  notes: z.string()
});

type VisitFormValues = z.infer<typeof visitFormSchema>;

type VisitFormProps = {
  mode: "create" | "edit";
  visit?: VisitDetail;
  client?: Client | null;
};

export function VisitForm({ mode, visit, client }: VisitFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientsQuery = useQuery({
    queryKey: ["clients", "visit-form"],
    queryFn: () => listClients({ isActive: true }),
    enabled: mode === "create"
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      clientId: visit?.clientId ?? "",
      visitedAt: toDateTimeLocalValue(visit?.visitedAt),
      notes: visit?.notes ?? ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: VisitFormValues) => {
      if (mode === "create") {
        return createVisit({
          clientId: values.clientId,
          visitedAt: values.visitedAt ? new Date(values.visitedAt).toISOString() : undefined,
          notes: values.notes.trim() || undefined
        });
      }

      return updateVisit(visit!.id, {
        visitedAt: values.visitedAt ? new Date(values.visitedAt).toISOString() : undefined,
        notes: values.notes.trim() || undefined
      });
    },
    onSuccess: async (savedVisit) => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["visit", savedVisit.id] });
      await navigate(mode === "create" ? `/visits/${savedVisit.id}` : `/visits/${visit!.id}`, { replace: true });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  if (mode === "create" && clientsQuery.isPending) {
    return <PageLoader label="Carregando clientes..." />;
  }

  if (mode === "create" && clientsQuery.isError) {
    return <ErrorBanner message="Nao foi possivel carregar os clientes para abrir a visita." />;
  }

  return (
    <Card>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}

        {mode === "create" ? (
          <Field label="Cliente" error={errors.clientId?.message}>
            <Select {...register("clientId")}>
              <option value="">Selecione um cliente</option>
              {clientsQuery.data?.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.tradeName}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Cliente">
            <div className="rounded-2xl border border-[var(--jam-border)] bg-white/80 px-4 py-3 text-sm font-medium text-[var(--jam-ink)]">
              {client?.tradeName ?? visit?.clientId}
            </div>
          </Field>
        )}

        <Field label="Data e hora da visita" error={errors.visitedAt?.message}>
          <Input type="datetime-local" {...register("visitedAt")} />
        </Field>

        <Field label="Observacoes" hint="O valor recebido fica para a etapa final, depois da conferencia dos itens.">
          <Textarea placeholder="Resumo da visita, combinados ou pendencias" {...register("notes")} />
        </Field>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button type="submit" className="w-full sm:flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : mode === "create" ? "Criar visita" : "Salvar rascunho"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function toDateTimeLocalValue(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
