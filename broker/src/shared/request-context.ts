import type { FastifyRequest } from 'fastify';

export interface RequestContext {
  requestId: string;
  route?: string;
  receivedAt: string;
}

export const createRequestContext = (request: FastifyRequest): RequestContext => ({
  requestId: request.id,
  route: request.routeOptions.url,
  receivedAt: new Date().toISOString(),
});

