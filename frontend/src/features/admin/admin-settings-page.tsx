import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  ConfirmDialog,
  DrawerPanel,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  PageLoader,
  SuccessBanner
} from "../../components/ui";
import { formatCnpjInput, formatDateTime, formatPhoneInput, onlyDigits } from "../../lib/format";
import { toOptionalString } from "../../lib/forms";
import { useLogout, useSessionUser } from "../auth/auth";
import { getAdminCompanyProfile, updateAdminCompanyProfile } from "./admin-api";
import { AdminInfoPanel, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";
import { getAdminErrorMessage } from "./admin-error-copy";

const adminCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa").max(200, "Use até 200 caracteres"),
  document: z
    .string()
    .refine((value) => value.trim() === "" || onlyDigits(value).length === 14, "Informe o CNPJ no formato 00.000.000/0001-00"),
  phone: z
    .string()
    .refine((value) => value.trim() === "" || [10, 11].includes(onlyDigits(value).length), "Informe telefone com DDD"),
  address: z.string().max(200, "Use até 200 caracteres"),
  email: z
    .string()
    .trim()
    .max(160, "Use até 160 caracteres")
    .refine(
      (value) => value.length === 0 || z.string().email().safeParse(value).success,
      "Informe um e-mail válido"
    ),
  contactName: z.string().max(160, "Use até 160 caracteres")
});

type AdminCompanyProfileValues = z.infer<typeof adminCompanyProfileSchema>;

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const sessionUser = useSessionUser();
  const logoutMutation = useLogout();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [discardAction, setDiscardAction] = useState<"close" | "reset" | null>(null);
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
      document: companyProfileQuery.data.document ? formatCnpjInput(companyProfileQuery.data.document) : "",
      phone: companyProfileQuery.data.phone ? formatPhoneInput(companyProfileQuery.data.phone) : "",
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
        document: savedProfile.document ? formatCnpjInput(savedProfile.document) : "",
        phone: savedProfile.phone ? formatPhoneInput(savedProfile.phone) : "",
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
  const documentRegistration = register("document");
  const phoneRegistration = register("phone");

  const resetToSavedProfile = () => {
    if (!companyProfileQuery.data) {
      return;
    }

    reset({
      companyName: companyProfileQuery.data.companyName,
      document: companyProfileQuery.data.document ? formatCnpjInput(companyProfileQuery.data.document) : "",
      phone: companyProfileQuery.data.phone ? formatPhoneInput(companyProfileQuery.data.phone) : "",
      address: companyProfileQuery.data.address ?? "",
      email: companyProfileQuery.data.email ?? "",
      contactName: companyProfileQuery.data.contactName ?? ""
    });
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSuccessMessage(null);
    resetToSavedProfile();
  };

  const requestDrawerClose = () => {
    if (isDirty && !mutation.isPending) {
      setDiscardAction("close");
      return;
    }

    closeDrawer();
  };

  const requestDiscardChanges = () => {
    if (isDirty && !mutation.isPending) {
      setDiscardAction("reset");
    }
  };

  const confirmDiscardChanges = () => {
    const action = discardAction;
    setDiscardAction(null);
    resetToSavedProfile();

    if (action === "close") {
      setIsDrawerOpen(false);
      setSuccessMessage(null);
    }
  };

  if (companyProfileQuery.isPending) {
    return <PageLoader label="Carregando configurações..." />;
  }

  if (companyProfileQuery.isError || !companyProfileQuery.data) {
    return (
      <AdminQueryErrorState
        title="Não foi possível carregar as configurações"
        error={companyProfileQuery.error}
        onRetry={() => void companyProfileQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/admin/dashboard"
        backLabel="Admin"
        eyebrow="Administração"
        title="Configurações"
        subtitle="Dados da empresa, comprovantes, parâmetros futuros e leitura da sessão atual."
      />

      {successMessage ? <SuccessBanner message={successMessage} /> : null}

      <AdminInfoPanel title="Uso atual desta área">
        <p>Os dados da empresa aparecem nos comprovantes emitidos pelo Jamval.</p>
        <p>Outras seções já ficam preparadas para evoluções futuras sem transformar a página em um formulário gigante.</p>
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
          <SummaryRow label="Endereço" value={companyProfileQuery.data.address} />
          <SummaryRow label="Email" value={companyProfileQuery.data.email} />
          <SummaryRow label="Responsável" value={companyProfileQuery.data.contactName} />
        </div>
      </AdminSectionCard>

      <AdminInfoPanel title="Outras configurações">
        <p><strong className="font-semibold text-[var(--jam-ink)]">Comprovantes:</strong> layout e preferências de emissão serão adicionados em uma próxima etapa.</p>
        <p><strong className="font-semibold text-[var(--jam-ink)]">Operação:</strong> regras de visita, catálogo e estoque ainda não são configuráveis aqui.</p>
        <p><strong className="font-semibold text-[var(--jam-ink)]">Preferências:</strong> automações e preferências pessoais ainda não estão disponíveis.</p>
      </AdminInfoPanel>

      <AdminSectionCard
        eyebrow="Segurança"
        title="Sessão e segurança"
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
            {logoutMutation.isPending ? "Saindo..." : "Sair da sessão"}
          </Button>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SummaryRow label="Nome" value={sessionUser?.name ?? "-"} />
          <SummaryRow label="Email" value={sessionUser?.email ?? "-"} />
          <SummaryRow label="Último login" value={sessionUser?.lastLoginAt ? formatDateTime(sessionUser.lastLoginAt) : "Sem registro"} />
          <SummaryRow label="Estado da conta" value={sessionUser?.isActive ? "Sessão ativa" : "Conta inativa"} />
        </div>
      </AdminSectionCard>

      <DrawerPanel
        open={isDrawerOpen}
        onClose={requestDrawerClose}
        title="Editar dados da empresa"
        description="Esses dados aparecem nos comprovantes emitidos pelo Jamval."
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          {mutation.error ? <ErrorBanner message={getAdminErrorMessage(mutation.error)} /> : null}

          <Field label="Nome da empresa" error={errors.companyName?.message}>
            <Input placeholder="Jamval Eletronicos" maxLength={200} {...register("companyName")} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Documento/CNPJ" error={errors.document?.message}>
              <Input
                placeholder="44.405.062/0001-03"
                inputMode="numeric"
                maxLength={18}
                {...documentRegistration}
                onChange={(event) => {
                  event.target.value = formatCnpjInput(event.target.value);
                  void documentRegistration.onChange(event);
                }}
              />
            </Field>

            <Field label="Telefone" error={errors.phone?.message}>
              <Input
                placeholder="(44) 99837-2556"
                inputMode="tel"
                maxLength={15}
                {...phoneRegistration}
                onChange={(event) => {
                  event.target.value = formatPhoneInput(event.target.value);
                  void phoneRegistration.onChange(event);
                }}
              />
            </Field>
          </div>

          <Field label="Endereço" error={errors.address?.message}>
            <Input placeholder="Campo Mourão - PR" maxLength={200} {...register("address")} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="contato@empresa.com" maxLength={160} {...register("email")} />
            </Field>

            <Field label="Responsável" error={errors.contactName?.message}>
              <Input placeholder="Nome do contato responsável" maxLength={160} {...register("contactName")} />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={requestDiscardChanges}
              disabled={!isDirty || mutation.isPending}
            >
              Descartar alterações
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </form>
      </DrawerPanel>

      <ConfirmDialog
        open={discardAction !== null}
        title="Descartar alterações?"
        message="Os dados preenchidos ainda não foram salvos e serão perdidos se você sair agora."
        confirmLabel="Descartar alterações"
        onCancel={() => setDiscardAction(null)}
        onConfirm={confirmDiscardChanges}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-[var(--jam-border)] py-2.5 last:border-b-0 sm:py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--jam-ink)]">{value && value.trim().length > 0 ? value : "-"}</p>
    </div>
  );
}
