import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import { adminProfitQuerySchema } from "./admin.schema";
import { AdminService } from "./admin.service";

export class AdminController {
  constructor(private readonly service = new AdminService()) {}

  getDashboard = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const dashboard = await this.service.getDashboard();

    reply.send({ data: dashboard });
  };

  getProfit = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(adminProfitQuerySchema, request.query);
    const profit = await this.service.getProfit(query);

    reply.send({ data: profit });
  };

  getIndicators = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const indicators = await this.service.getIndicators();

    reply.send({ data: indicators });
  };
}
