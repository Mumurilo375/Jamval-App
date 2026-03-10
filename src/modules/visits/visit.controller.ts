import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  bulkUpsertVisitItemsBodySchema,
  createVisitBodySchema,
  patchVisitItemBodySchema,
  updateVisitBodySchema,
  visitIdParamSchema,
  visitItemParamsSchema,
  visitListQuerySchema
} from "./visit.schema";
import { VisitService } from "./visit.service";

export class VisitController {
  constructor(private readonly service = new VisitService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(createVisitBodySchema, request.body);
    const visit = await this.service.create(body);

    reply.status(201).send({ data: visit });
  };

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(visitListQuerySchema, request.query);
    const visits = await this.service.list(query);

    reply.send({ data: visits });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitIdParamSchema, request.params);
    const visit = await this.service.getById(params.id);

    reply.send({ data: visit });
  };

  update = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitIdParamSchema, request.params);
    const body = parseWithZod(updateVisitBodySchema, request.body);
    const visit = await this.service.update(params.id, body);

    reply.send({ data: visit });
  };

  bulkUpsertItems = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitIdParamSchema, request.params);
    const body = parseWithZod(bulkUpsertVisitItemsBodySchema, request.body);
    const visit = await this.service.bulkUpsertItems(params.id, body);

    reply.send({ data: visit });
  };

  patchItem = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitItemParamsSchema, request.params);
    const body = parseWithZod(patchVisitItemBodySchema, request.body);
    const visit = await this.service.patchItem(params.id, params.itemId, body);

    reply.send({ data: visit });
  };

  deleteItem = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitItemParamsSchema, request.params);
    const visit = await this.service.deleteItem(params.id, params.itemId);

    reply.send({ data: visit });
  };

  cancel = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(visitIdParamSchema, request.params);
    const visit = await this.service.cancel(params.id);

    reply.send({ data: visit });
  };
}
