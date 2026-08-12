import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import { adminCompanyProfileBodySchema, adminDashboardQuerySchema, adminProfitQuerySchema } from "./admin.schema";
import { AdminService } from "./admin.service";

export class AdminController {
  constructor(private readonly service = new AdminService()) {}

  getDashboard = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(adminDashboardQuerySchema, request.query);
    const dashboard = await this.service.getDashboard(query);

    reply.send({ data: dashboard });
  };

  getCompanyProfile = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const companyProfile = await this.service.getCompanyProfile();

    reply.send({ data: companyProfile });
  };

  updateCompanyProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(adminCompanyProfileBodySchema, request.body);
    const companyProfile = await this.service.updateCompanyProfile(body);

    reply.send({ data: companyProfile });
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
