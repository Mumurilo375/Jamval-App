import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  createProductBodySchema,
  productIdParamSchema,
  productListQuerySchema,
  updateProductBodySchema
} from "./product.schema";
import { ProductService } from "./product.service";

export class ProductController {
  constructor(private readonly service = new ProductService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(productListQuerySchema, request.query);
    const products = await this.service.list(query);

    reply.send({ data: products });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(productIdParamSchema, request.params);
    const product = await this.service.getById(params.id);

    reply.send({ data: product });
  };

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(createProductBodySchema, request.body);
    const product = await this.service.create(body);

    reply.status(201).send({ data: product });
  };

  update = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(productIdParamSchema, request.params);
    const body = parseWithZod(updateProductBodySchema, request.body);
    const product = await this.service.update(params.id, body);

    reply.send({ data: product });
  };

  activate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(productIdParamSchema, request.params);
    const product = await this.service.activate(params.id);

    reply.send({ data: product });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(productIdParamSchema, request.params);
    const product = await this.service.deactivate(params.id);

    reply.send({ data: product });
  };
}
