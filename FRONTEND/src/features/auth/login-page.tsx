import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "../../lib/api";
import { Button, Card, ErrorBanner, Field, Input } from "../../components/ui";
import { useLogin } from "./auth";

const loginSchema = z.object({
  email: z.string().trim().email("Digite um e-mail valido"),
  password: z.string().min(6, "Digite sua senha")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
  });

  return (
    <div className="min-h-screen bg-[var(--jam-bg)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[420px] flex-col justify-center">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jam-subtle)]">Jamval</p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-[var(--jam-ink)]">Acesse a operacao</h1>
          <p className="mt-2 text-sm text-[var(--jam-subtle)]">
          Entre com o usuario administrador para abrir visitas, revisar visitas nao finalizadas e manter os cadastros.
          </p>
        </div>

        <Card className="space-y-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            {loginMutation.error instanceof ApiError ? <ErrorBanner message={loginMutation.error.message} /> : null}

            <Field label="E-mail" error={errors.email?.message}>
              <Input type="email" placeholder="admin@jamval.local" autoComplete="email" {...register("email")} />
            </Field>

            <Field label="Senha" error={errors.password?.message}>
              <Input type="password" placeholder="Sua senha" autoComplete="current-password" {...register("password")} />
            </Field>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Entrando..." : "Entrar no Jamval"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
