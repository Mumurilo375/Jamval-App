import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, ErrorBanner, Field, Input, PageHeader, PageLoader, SuccessBanner } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { toOptionalString } from "../../lib/forms";
import { getAdminCompanyProfile, updateAdminCompanyProfile } from "./admin-api";
import { AdminInfoPanel, AdminQueryErrorState } from "./admin-ui";

const adminCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa"),
  document: z.string(),
  phone: z.string(),
  address: z.string(),
  email: z.string().trim().refine((value) => value.length === 0 || z.string().email().safeParse(value).success, "Informe um email valido"),
  contactName: z.string()
});

type AdminCompanyProfileValues = z.infer<typeof adminCompanyProfileSchema>;

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const companyProfileQuery = useQuery({
    queryKey: ["admin", "company-profile"],
    queryFn: () => getAdminCompanyProfile()
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<AdminCompanyProfileValues>({
    resolver: zodResolver(adminCompanyProfileSchema),
    defaultValues: {
      companyName: "",
      document: "",
      phone: "",
      address: "",
      email: "",
      contactName: ""
    }
  });

  useEffect(() => {
    if (!companyProfileQuery.data) {
      return;
    }

    reset({
      companyName: companyProfileQuery.data.companyName,
      document: companyProfileQuery.data.document ?? "",
      phone: companyProfileQuery.data.phone ?? "",
      address: companyProfileQuery.data.address ?? "",
      email: companyProfileQuery.data.email ?? "",
      contactName: companyProfileQuery.data.contactName ?? ""
    });
  }, [companyProfileQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: AdminCompanyProfileValues) =>
      updateAdminCompanyProfile({
        companyName: values.companyName.trim(),
        document: toOptionalString(values.document) ?? null,
        phone: toOptionalString(values.phone) ?? null,
        address: toOptionalString(values.address) ?? null,
        email: toOptionalString(values.email) ?? null,
        contactName: toOptionalString(values.contactName) ?? null
      }),
    onSuccess: async (savedProfile) => {
      setSuccessMessage("Dados institucionais atualizados.");
      reset({
        companyName: savedProfile.companyName,
        document: savedProfile.document ?? "",
        phone: savedProfile.phone ?? "",
        address: savedProfile.address ?? "",
        email: savedProfile.email ?? "",
        contactName: savedProfile.contactName ?? ""
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "company-profile"] });
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    await mutation.mutateAsync(values);
  });

  if (companyProfileQuery.isPending) {
    return <PageLoader label="Carregando configuracoes..." />;
  }

  if (companyProfileQuery.isError || !companyProfileQuery.data) {
    return (
      <AdminQueryErrorState
        title="Nao foi possivel carregar as configuracoes"
        error={companyProfileQuery.error}
        onRetry={() => void companyProfileQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administracao"
        title="Configuracoes"
        subtitle="Dados institucionais usados em comprovantes e documentos gerados pelo sistema."
      />

      <AdminInfoPanel title="Uso atual desta configuracao">
        <p>Esses dados aparecem nos comprovantes emitidos pelo Jamval.</p>
        <p>Alteracoes passam a valer em novas geracoes e regeneracoes de comprovante.</p>
      </AdminInfoPanel>

      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          {mutation.error instanceof ApiError ? <ErrorBanner message={mutation.error.message} /> : null}
          {successMessage ? <SuccessBanner message={successMessage} /> : null}

          <Field label="Nome da empresa" error={errors.companyName?.message}>
            <Input placeholder="Jamval Eletronicos" {...register("companyName")} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Documento/CNPJ" error={errors.document?.message}>
              <Input placeholder="44.405.062/0001-03" {...register("document")} />
            </Field>

            <Field label="Telefone" error={errors.phone?.message}>
              <Input placeholder="44 99837-2556" {...register("phone")} />
            </Field>
          </div>

          <Field label="Endereco" error={errors.address?.message}>
            <Input placeholder="Campo Mourao - PR" {...register("address")} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="contato@empresa.com" {...register("email")} />
            </Field>

            <Field label="Responsavel" error={errors.contactName?.message}>
              <Input placeholder="Nome do contato responsavel" {...register("contactName")} />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() =>
                reset({
                  companyName: companyProfileQuery.data.companyName,
                  document: companyProfileQuery.data.document ?? "",
                  phone: companyProfileQuery.data.phone ?? "",
                  address: companyProfileQuery.data.address ?? "",
                  email: companyProfileQuery.data.email ?? "",
                  contactName: companyProfileQuery.data.contactName ?? ""
                })
              }
              disabled={!isDirty || mutation.isPending}
            >
              Descartar alteracoes
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar configuracoes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
