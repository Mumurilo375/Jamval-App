import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../../shared/errors/app-error";
import { parseWithZod } from "../../shared/validation/parse-with-zod";
import { loginBodySchema } from "./auth.schema";
import { clearSessionCookie, setSessionCookie } from "./auth-session";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  login = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(loginBodySchema, request.body);
    const result = await this.service.login(body);

    setSessionCookie(reply, result.sessionToken);

    reply.send({
      data: {
        user: result.user
      }
    });
  };

  logout = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authUser = requireAuthUser(request);
    await this.service.logout(authUser.id);
    clearSessionCookie(reply);

    reply.send({
      data: {
        loggedOut: true
      }
    });
  };

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authUser = requireAuthUser(request);
    const user = await this.service.getMe(authUser.id);

    reply.send({
      data: {
        user
      }
    });
  };
}

function requireAuthUser(request: FastifyRequest) {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  return request.authUser;
}
