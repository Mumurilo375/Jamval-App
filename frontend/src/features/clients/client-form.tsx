import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, Checkbox, ErrorBanner, Field, Input, Textarea } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { toOptionalNumber, toOptionalString } from "../../lib/forms";
import type { Client } from "../../types/domain";
import { createClient, updateClient } from "./clients-api";

const clientFormSchema = z.object({
  tradeName: z.string().trim().min(1, "Informe o nome fantasia"),
  legalName: z.string(),
  documentNumber: z.string(),
  stateRegistration: z.string(),
  contactName: z.string(),
  phone: z.string(),
  addressLine: z.string(),
  addressCity: z.string(),
  addressState: z.string(),
  addressZipcode: z.string(),
  notes: z.string(),
  visitCycleDays: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) > 0), "Informe um numero valido"),
  requiresInvoice: z.boolean(),
  isActive: z.boolean()
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

type ClientFormProps = {
  mode: "create" | "edit";
  client?: Client;
};

export function ClientForm({ mode, client }: ClientFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      tradeName: client?.tradeName ?? "",
      legalName: client?.legalName ?? "",
      documentNumber: client?.documentNumber ?? "",
      stateRegistration: client?.stateRegistration ?? "",
      contactName: client?.contactName ?? "",
      phone: client?.phone ?? "",
      addressLine: client?.addressLine ?? "",
      addressCity: client?.addressCity ?? "",
      addressState: client?.addressState ?? "",
      addressZipcode: client?.addressZipcode ?? "",
      notes: client?.notes ?? "",
      visitCycleDays: client?.visitCycleDays ? String(client.visitCycleDays) : "",
      requiresInvoice: client?.requiresInvoice ?? false,
      isActive: client?.isActive ?? true
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload = {
        tradeName: values.tradeName.trim(),
        legalName: toOptionalString(values.legalName),
        documentNumber: toOptionalString(values.documentNumber),
        stateRegistration: toOptionalString(values.stateRegistration),
        contactName: toOptionalString(values.contactName),
        phone: toOptionalString(values.phone),
        addressLine: toOptionalString(values.addressLine),
        addressCity: toOptionalString(values.addressCity),
        addressState: toOptionalString(values.addressState),
        addressZipcode: toOptionalString(values.addressZipcode),
        notes: toOptionalString(values.notes),
        visitCycleDays: toOptionalNumber(values.visitCycleDays),
        requiresInvoice: values.requiresInvoice,
        isActive: values.isActive
      };

      return mode === "create" ? createClient(payload) : updateClient(client!.id, payload);
    },
    onSuccess: async (savedClient) => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["client", savedClient.id] });
      await navigate("/clients", { replace: true });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card>
      <form className="space-y-4" onSubmit={onSubmit}>
        {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}

        <Field label="Nome fantasia" error={errors.tradeName?.message}>
          <Input placeholder="Loja Exemplo" {...register("tradeName")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razao social">
            <Input placeholder="Loja Exemplo LTDA" {...register("legalName")} />
          </Field>

          <Field label="Contato">
            <Input placeholder="Joao" {...register("contactName")} />
          </Field>

          <Field label="Documento">
            <Input placeholder="00.000.000/0001-00" {...register("documentNumber")} />
          </Field>

          <Field label="Telefone">
            <Input placeholder="(11) 99999-9999" {...register("phone")} />
          </Field>

          <Field label="Inscricao estadual">
            <Input placeholder="123.456.789.000" {...register("stateRegistration")} />
          </Field>

          <Field label="Ciclo de visita (dias)" error={errors.visitCycleDays?.message}>
            <Input inputMode="numeric" placeholder="30" {...register("visitCycleDays")} />
          </Field>
        </div>

        <Field label="Endereco">
          <Input placeholder="Rua, numero e bairro" {...register("addressLine")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cidade">
            <Input placeholder="Sao Paulo" {...register("addressCity")} />
          </Field>

          <Field label="UF">
            <Input placeholder="SP" maxLength={2} {...register("addressState")} />
          </Field>

          <Field label="CEP">
            <Input placeholder="00000-000" {...register("addressZipcode")} />
          </Field>
        </div>

        <Field label="Observacoes">
          <Textarea placeholder="Notas importantes sobre o cliente" {...register("notes")} />
        </Field>

        <div className="grid gap-3">
          <Checkbox
            {...register("isActive")}
            label="Cliente ativo"
            checked={watch("isActive")}
            onChange={(event) => setValue("isActive", event.target.checked, { shouldDirty: true })}
          />
          <Checkbox
            {...register("requiresInvoice")}
            label="Exige nota fiscal"
            checked={watch("requiresInvoice")}
            onChange={(event) => setValue("requiresInvoice", event.target.checked, { shouldDirty: true })}
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : mode === "create" ? "Criar cliente" : "Salvar alteracoes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
