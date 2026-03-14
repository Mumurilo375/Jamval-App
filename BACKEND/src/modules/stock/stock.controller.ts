import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import {
  centralBalancesQuerySchema,
  centralInitialLoadBodySchema,
  centralManualAdjustmentBodySchema,
  centralManualEntryBodySchema,
  centralMovementsQuerySchema,
  centralVisitOutflowsQuerySchema
} from "./stock.schema";
import { StockService } from "./stock.service";

export class StockController {
  constructor(private readonly service = new StockService()) {}

  listCentralBalances = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(centralBalancesQuerySchema, request.query);
    const balances = await this.service.listCentralBalances(query.productIds);

    reply.send({ data: balances });
  };

  getCentralOverview = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const overview = await this.service.getCentralOverview();

    reply.send({ data: overview });
  };

  listCentralMovements = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(centralMovementsQuerySchema, request.query);
    const movements = await this.service.listCentralMovements(query);

    reply.send({ data: movements });
  };

  listCentralVisitOutflows = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = parseWithZod(centralVisitOutflowsQuerySchema, request.query);
    const outflows = await this.service.listCentralVisitOutflows(query);

    reply.send({ data: outflows });
  };

  createCentralInitialLoad = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(centralInitialLoadBodySchema, request.body);
    await this.service.createInitialLoad(body);

    reply.status(201).send({ data: { success: true } });
  };

  createCentralManualEntry = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(centralManualEntryBodySchema, request.body);
    await this.service.createManualEntry(body);

    reply.status(201).send({ data: { success: true } });
  };

  createCentralManualAdjustment = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = parseWithZod(centralManualAdjustmentBodySchema, request.body);
    await this.service.createManualAdjustment(body);

    reply.status(201).send({ data: { success: true } });
  };
}
