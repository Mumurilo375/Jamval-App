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
    <div className="app-grid min-h-screen px-3 py-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[460px] flex-col justify-center">
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(145deg,#2f1b0d_0%,#8a4316_100%)] px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Jamval V1</p>
            <h1 className="font-display mt-2 text-3xl font-bold">Login rapido para operar no celular</h1>
            <p className="mt-2 text-sm text-amber-50/80">
              Entre com o usuario administrador para acessar produtos, clientes e catalogo.
            </p>
          </div>

          <form className="space-y-4 p-5" onSubmit={onSubmit}>
            {loginMutation.error instanceof ApiError ? <ErrorBanner message={loginMutation.error.message} /> : null}

            <Field label="E-mail" error={errors.email?.message}>
              <Input type="email" placeholder="admin@jamval.local" autoComplete="email" {...register("email")} />
            </Field>

            <Field label="Senha" error={errors.password?.message}>
              <Input type="password" placeholder="Sua senha" autoComplete="current-password" {...register("password")} />
            </Field>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
