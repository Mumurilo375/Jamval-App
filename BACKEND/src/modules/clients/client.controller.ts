import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  clientIdParamSchema,
  clientListQuerySchema,
  createClientBodySchema,
  updateClientBodySchema
} from "./client.schema";
import { ClientService } from "./client.service";

export class ClientController {
  constructor(private readonly service = new ClientService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(clientListQuerySchema, request.query);
    const clients = await this.service.list(query);

    reply.send({ data: clients });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientIdParamSchema, request.params);
    const client = await this.service.getById(params.id);

    reply.send({ data: client });
  };

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(createClientBodySchema, request.body);
    const client = await this.service.create(body);

    reply.status(201).send({ data: client });
  };

  update = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientIdParamSchema, request.params);
    const body = parseWithZod(updateClientBodySchema, request.body);
    const client = await this.service.update(params.id, body);

    reply.send({ data: client });
  };
}
