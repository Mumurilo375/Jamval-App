import { ApiError } from "../../lib/api";

export function getAdminErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sua sessão não foi aceita para consultar a Administração. Entre novamente e tente abrir a página outra vez.";
    }

    if (error.status === 403) {
      return "Sua conta não tem permissão para acessar esta área administrativa.";
    }

    if (error.status === 404) {
      return "Esta área administrativa não está disponível no momento.";
    }

    if (error.status === 429) {
      return "Muitas tentativas foram feitas em pouco tempo. Aguarde alguns instantes e tente novamente.";
    }

    if (error.status >= 400 && error.status < 500) {
      return "Os dados enviados não foram aceitos. Confira as informações e tente novamente.";
    }

    if (error.status === 0) {
      return "Não foi possível alcançar o backend agora. Confira se a API do Jamval está rodando e tente novamente.";
    }

    if (error.status >= 500) {
      return "O servidor encontrou um problema ao carregar esta área administrativa. Tente novamente em alguns instantes.";
    }
  }

  return "Não foi possível carregar esta área administrativa no momento. Tente novamente em alguns instantes.";
}
