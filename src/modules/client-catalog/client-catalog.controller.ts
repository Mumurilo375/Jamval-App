import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  clientCatalogClientParamsSchema,
  clientCatalogItemParamsSchema,
  clientCatalogListQuerySchema,
  createClientCatalogBodySchema,
  updateClientCatalogBodySchema
} from "./client-catalog.schema";
import { ClientCatalogService } from "./client-catalog.service";

export class ClientCatalogController {
  constructor(private readonly service = new ClientCatalogService()) {}

  listByClient = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientCatalogClientParamsSchema, request.params);
    const query = parseWithZod(clientCatalogListQuerySchema, request.query);
    const items = await this.service.listByClient(params.clientId, query);

    reply.send({ data: items });
  };

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientCatalogClientParamsSchema, request.params);
    const body = parseWithZod(createClientCatalogBodySchema, request.body);
    const item = await this.service.create(params.clientId, body);

    reply.status(201).send({ data: item });
  };

  update = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientCatalogItemParamsSchema, request.params);
    const body = parseWithZod(updateClientCatalogBodySchema, request.body);
    const item = await this.service.update(params.clientId, params.clientProductId, body);

    reply.send({ data: item });
  };
}
