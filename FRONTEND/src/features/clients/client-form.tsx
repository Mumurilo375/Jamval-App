import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Card, Checkbox, ErrorBanner, Field, Input, Textarea } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { isPositiveIntegerInput, toOptionalNumber, toOptionalString } from "../../lib/forms";
import {
  formatBrazilStateInput,
  formatCnpjInput,
  formatPhoneInput,
  formatZipcodeInput,
  onlyDigits
} from "../../lib/format";
import type { Client } from "../../types/domain";
import { createClient, updateClient } from "./clients-api";

const clientFormSchema = z.object({
  tradeName: z.string().trim().min(1, "Informe o nome fantasia").max(200, "Use ate 200 caracteres"),
  legalName: z.string().max(200, "Use ate 200 caracteres"),
  documentNumber: z
    .string()
    .refine((value) => value.trim() === "" || onlyDigits(value).length === 14, "Informe o CNPJ no formato 00.000.000/0001-00"),
  stateRegistration: z
    .string()
    .refine((value) => value.trim() === "" || /^\d{8,12}$/.test(onlyDigits(value)), "Informe de 8 a 12 digitos"),
  contactName: z.string().max(160, "Use ate 160 caracteres"),
  phone: z
    .string()
    .refine((value) => value.trim() === "" || [10, 11].includes(onlyDigits(value).length), "Informe telefone com DDD"),
  addressLine: z.string().max(200, "Use ate 200 caracteres"),
  addressCity: z.string().max(120, "Use ate 120 caracteres"),
  addressState: z
    .string()
    .refine((value) => value.trim() === "" || /^[A-Z]{2}$/.test(value.trim()), "Informe uma UF valida"),
  addressZipcode: z
    .string()
    .refine((value) => value.trim() === "" || onlyDigits(value).length === 8, "Informe um CEP valido"),
  notes: z.string().max(2000, "Use ate 2000 caracteres"),
  visitCycleDays: z
    .string()
    .trim()
    .refine((value) => value === "" || isPositiveIntegerInput(value), "Informe um numero inteiro maior que zero")
    .refine((value) => value === "" || Number(value) <= 3650, "Use ate 3650 dias"),
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
      documentNumber: client?.documentNumber ? formatCnpjInput(client.documentNumber) : "",
      stateRegistration: client?.stateRegistration ?? "",
      contactName: client?.contactName ?? "",
      phone: client?.phone ? formatPhoneInput(client.phone) : "",
      addressLine: client?.addressLine ?? "",
      addressCity: client?.addressCity ?? "",
      addressState: client?.addressState ? formatBrazilStateInput(client.addressState) : "",
      addressZipcode: client?.addressZipcode ? formatZipcodeInput(client.addressZipcode) : "",
      notes: client?.notes ?? "",
      visitCycleDays: client?.visitCycleDays ? String(client.visitCycleDays) : "",
      requiresInvoice: client?.requiresInvoice ?? false,
      isActive: client?.isActive ?? true
    }
  });
  const documentNumberRegistration = register("documentNumber");
  const stateRegistrationRegistration = register("stateRegistration");
  const phoneRegistration = register("phone");
  const addressStateRegistration = register("addressState");
  const addressZipcodeRegistration = register("addressZipcode");

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload = {
        tradeName: values.tradeName.trim(),
        legalName: toOptionalString(values.legalName),
        documentNumber: toOptionalString(values.documentNumber),
        stateRegistration: toOptionalString(onlyDigits(values.stateRegistration)),
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
          <Input placeholder="Loja Exemplo" maxLength={200} {...register("tradeName")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razao social" error={errors.legalName?.message}>
            <Input placeholder="Loja Exemplo LTDA" maxLength={200} {...register("legalName")} />
          </Field>

          <Field label="Contato" error={errors.contactName?.message}>
            <Input placeholder="Joao" maxLength={160} {...register("contactName")} />
          </Field>

          <Field label="Documento" error={errors.documentNumber?.message}>
            <Input
              placeholder="00.000.000/0001-00"
              inputMode="numeric"
              maxLength={18}
              {...documentNumberRegistration}
              onChange={(event) => {
                event.target.value = formatCnpjInput(event.target.value);
                void documentNumberRegistration.onChange(event);
              }}
            />
          </Field>

          <Field label="Telefone" error={errors.phone?.message}>
            <Input
              placeholder="(11) 99999-9999"
              inputMode="tel"
              maxLength={15}
              {...phoneRegistration}
              onChange={(event) => {
                event.target.value = formatPhoneInput(event.target.value);
                void phoneRegistration.onChange(event);
              }}
            />
          </Field>

          <Field label="Inscricao estadual" error={errors.stateRegistration?.message}>
            <Input
              placeholder="123456789"
              inputMode="numeric"
              maxLength={12}
              {...stateRegistrationRegistration}
              onChange={(event) => {
                event.target.value = onlyDigits(event.target.value).slice(0, 12);
                void stateRegistrationRegistration.onChange(event);
              }}
            />
          </Field>

          <Field label="Ciclo de visita (dias)" error={errors.visitCycleDays?.message}>
            <Input inputMode="numeric" placeholder="30" {...register("visitCycleDays")} />
          </Field>
        </div>

        <Field label="Endereco" error={errors.addressLine?.message}>
          <Input placeholder="Rua, numero e bairro" maxLength={200} {...register("addressLine")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cidade" error={errors.addressCity?.message}>
            <Input placeholder="Sao Paulo" maxLength={120} {...register("addressCity")} />
          </Field>

          <Field label="UF" error={errors.addressState?.message}>
            <Input
              placeholder="PR"
              maxLength={2}
              {...addressStateRegistration}
              onChange={(event) => {
                event.target.value = formatBrazilStateInput(event.target.value);
                void addressStateRegistration.onChange(event);
              }}
            />
          </Field>

          <Field label="CEP" error={errors.addressZipcode?.message}>
            <Input
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              {...addressZipcodeRegistration}
              onChange={(event) => {
                event.target.value = formatZipcodeInput(event.target.value);
                void addressZipcodeRegistration.onChange(event);
              }}
            />
          </Field>
        </div>

        <Field label="Observacoes" error={errors.notes?.message}>
          <Textarea placeholder="Notas importantes sobre o cliente" maxLength={2000} {...register("notes")} />
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
