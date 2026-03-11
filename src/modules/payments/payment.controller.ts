import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  clientPaymentHistoryParamsSchema,
  createPaymentBodySchema,
  receivablePaymentParamsSchema
} from "./payment.schema";
import { PaymentService } from "./payment.service";

export class PaymentController {
  constructor(private readonly service = new PaymentService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(receivablePaymentParamsSchema, request.params);
    const body = parseWithZod(createPaymentBodySchema, request.body);
    const result = await this.service.create(params.id, body);

    reply.status(201).send({ data: result });
  };

  listByClient = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(clientPaymentHistoryParamsSchema, request.params);
    const payments = await this.service.listByClient(params.id);

    reply.send({ data: payments });
  };
}
