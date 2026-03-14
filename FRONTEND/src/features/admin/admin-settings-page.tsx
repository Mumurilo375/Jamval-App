import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  Card,
  DrawerPanel,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  PageLoader,
  SuccessBanner
} from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import { toOptionalString } from "../../lib/forms";
import { useLogout, useSessionUser } from "../auth/auth";
import { getAdminCompanyProfile, updateAdminCompanyProfile } from "./admin-api";
import { AdminInfoPanel, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

const adminCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa"),
  document: z.string(),
  phone: z.string(),
  address: z.string(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.string().email().safeParse(value).success,
      "Informe um email valido"
    ),
  contactName: z.string()
});

type AdminCompanyProfileValues = z.infer<typeof adminCompanyProfileSchema>;

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const sessionUser = useSessionUser();
  const logoutMutation = useLogout();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      setSuccessMessage("Dados da empresa atualizados.");
      reset({
        companyName: savedProfile.companyName,
        document: savedProfile.document ?? "",
        phone: savedProfile.phone ?? "",
        address: savedProfile.address ?? "",
        email: savedProfile.email ?? "",
        contactName: savedProfile.contactName ?? ""
      });
      setIsDrawerOpen(false);
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
        subtitle="Dados da empresa, comprovantes, parametros futuros e leitura da sessao atual."
      />

      {successMessage ? <SuccessBanner message={successMessage} /> : null}

      <AdminInfoPanel title="Uso atual desta area">
        <p>Os dados da empresa aparecem nos comprovantes emitidos pelo Jamval.</p>
        <p>Outras secoes ja ficam preparadas para evolucoes futuras sem transformar a pagina em um formulario gigante.</p>
      </AdminInfoPanel>

      <AdminSectionCard
        eyebrow="Empresa"
        title="Empresa e comprovantes"
        description="Resumo dos dados institucionais usados hoje nos comprovantes."
        action={
          <Button type="button" onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto">
            Editar
          </Button>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SummaryRow label="Nome da empresa" value={companyProfileQuery.data.companyName} />
          <SummaryRow label="Documento/CNPJ" value={companyProfileQuery.data.document} />
          <SummaryRow label="Telefone" value={companyProfileQuery.data.phone} />
          <SummaryRow label="Endereco" value={companyProfileQuery.data.address} />
          <SummaryRow label="Email" value={companyProfileQuery.data.email} />
          <SummaryRow label="Responsavel" value={companyProfileQuery.data.contactName} />
        </div>
      </AdminSectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <AdminSectionCard
          eyebrow="Comprovantes"
          title="Comprovantes"
          description="Espaco reservado para futuras configuracoes de layout e emissao."
        >
          <PlaceholderCopy text="Padrao visual, dados complementares e preferencias de geracao vao entrar aqui em rodadas futuras." />
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Operacao"
          title="Parametros operacionais"
          description="Centralizacao futura de ajustes que impactam a rotina."
        >
          <PlaceholderCopy text="Regras de visita, catalogo e estoque poderao ser configuradas aqui quando essa frente entrar no escopo." />
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Preferencias"
          title="Preferencias futuras"
          description="Espaco reservado para ajustes pessoais e preferenciais."
        >
          <PlaceholderCopy text="Preferencias pessoais, automacoes e detalhes de uso ainda nao estao disponiveis nesta versao." />
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        eyebrow="Seguranca"
        title="Sessao e seguranca"
        description="Leitura da conta atualmente conectada."
        action={
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              void logoutMutation.mutateAsync();
            }}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Saindo..." : "Sair da sessao"}
          </Button>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SummaryRow label="Nome" value={sessionUser?.name ?? "-"} />
          <SummaryRow label="Email" value={sessionUser?.email ?? "-"} />
          <SummaryRow label="Ultimo login" value={sessionUser?.lastLoginAt ? formatDateTime(sessionUser.lastLoginAt) : "Sem registro"} />
          <SummaryRow label="Estado da conta" value={sessionUser?.isActive ? "Sessao ativa" : "Conta inativa"} />
        </div>
      </AdminSectionCard>

      <DrawerPanel
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSuccessMessage(null);
          reset({
            companyName: companyProfileQuery.data.companyName,
            document: companyProfileQuery.data.document ?? "",
            phone: companyProfileQuery.data.phone ?? "",
            address: companyProfileQuery.data.address ?? "",
            email: companyProfileQuery.data.email ?? "",
            contactName: companyProfileQuery.data.contactName ?? ""
          });
        }}
        title="Editar dados da empresa"
        description="Esses dados aparecem nos comprovantes emitidos pelo Jamval."
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          {mutation.error instanceof Error ? <ErrorBanner message={mutation.error.message} /> : null}

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
              {mutation.isPending ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </form>
      </DrawerPanel>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Card className="space-y-1.5 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--jam-ink)]">{value && value.trim().length > 0 ? value : "-"}</p>
    </Card>
  );
}

function PlaceholderCopy({ text }: { text: string }) {
  return <p className="text-sm text-[var(--jam-subtle)]">{text}</p>;
}
