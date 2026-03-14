import type { FastifyReply, FastifyRequest } from "fastify";

import { parseWithZod } from "../../shared/validation/parse-with-zod";
import { receiptDocumentParamsSchema, receiptVisitParamsSchema } from "./receipt.schema";
import { ReceiptService } from "./receipt.service";

export class ReceiptController {
  constructor(private readonly service = new ReceiptService()) {}

  generate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(receiptVisitParamsSchema, request.params);
    const receipt = await this.service.generateForVisit(params.id);

    reply.send({ data: receipt });
  };

  getByVisit = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(receiptVisitParamsSchema, request.params);
    const receipt = await this.service.getByVisitId(params.id);

    reply.send({ data: receipt });
  };

  download = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = parseWithZod(receiptDocumentParamsSchema, request.params);
    const result = await this.service.getDownload(params.id);

    reply.header("Content-Disposition", `attachment; filename=\"${result.receiptDocument.fileName}\"`);
    reply.type(result.receiptDocument.mimeType);
    reply.send(result.content);
  };
}
