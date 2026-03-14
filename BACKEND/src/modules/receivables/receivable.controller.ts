import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  clientReceivableParamsSchema,
  receivableIdParamSchema,
  receivableListQuerySchema
} from "./receivable.schema";
import { ReceivableService } from "./receivable.service";

export class ReceivableController {
  constructor(private readonly service = new ReceivableService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(receivableListQuerySchema, request.query);
    const receivables = await this.service.list(query);

    reply.send({ data: receivables });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(receivableIdParamSchema, request.params);
    const receivable = await this.service.getById(params.id);

    reply.send({ data: receivable });
  };

  listByClient = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientReceivableParamsSchema, request.params);
    const receivables = await this.service.listByClient(params.id);

    reply.send({ data: receivables });
  };
}
