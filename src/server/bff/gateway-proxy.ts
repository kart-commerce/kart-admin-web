import { randomBytes } from 'node:crypto';
import { Request, Response, Router } from 'express';

import { readSessionId } from './cookie';
import { sessionStore } from './session-store';
import { logger } from '../logger';
import { SERVICE_ENDPOINTS } from '../../app/core/config/service-endpoints';

const GATEWAY_BASE_URL = process.env['GATEWAY_BASE_URL'] ?? SERVICE_ENDPOINTS.gateway;

/**
 * Token-relay proxy for every generated client under `core/http/generated`
 * (admin, order, payment, analytics, order-returns, etc. — see
 * `GATEWAY_BASE_PATH` in `core/http/base-path.ts`). Unlike `kart-web`,
 * there is no public/anonymous split here: this whole app is an
 * "internal, authenticated-only SPA" (README.md), so every call the
 * browser makes needs the session's bearer token attached. This is the one
 * place besides `/api/bff/auth/*` the BFF touches a token — it never hands
 * the token to the browser, it attaches it server-side to the relayed
 * request (security.md's BFF pattern, generalized from "auth calls only"
 * to "every call that carries a session"), mirroring `kart-web`'s own
 * `server/bff/gateway-proxy.ts`.
 *
 * A request with no active session still proxies through untouched (no
 * `Authorization` header attached) — the Gateway's own JWT-bearer
 * middleware is the actual enforcement point (`kart-api-gateway`'s
 * `AuthenticationExtensions`), not this proxy; it 401s exactly as it would
 * for any other unauthenticated caller.
 */
export const gatewayProxyRouter = Router();

const FORWARDED_REQUEST_HEADERS = ['idempotency-key', 'if-match', 'content-type'] as const;

const FORWARDED_RESPONSE_HEADERS = ['etag', 'content-type', 'location'] as const;

const TRACEPARENT_HEADER = 'traceparent';

/**
 * The browser has no OpenTelemetry SDK, so no request arrives here already carrying a real W3C
 * `traceparent` (https://www.w3.org/TR/trace-context/) — this BFF is the actual origin of every
 * trace this flow's tracing standard requires. Generates one fresh per request (root span, no
 * parent) unless a caller already supplied a well-formed one (future-proofing for a browser-side
 * tracer, or a server-to-server caller that already has a trace in flight) — ASP.NET Core's
 * auto-instrumentation on the gateway/admin-service/product-service side then extracts this same
 * header natively, continuing the identical trace with no code of its own needed for that half.
 */
function resolveTraceParent(req: Request): string {
  const incoming = req.headers[TRACEPARENT_HEADER];
  if (typeof incoming === 'string' && /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/.test(incoming)) {
    return incoming;
  }

  const traceId = randomBytes(16).toString('hex');
  const spanId = randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

gatewayProxyRouter.use(async (req: Request, res: Response) => {
  const sessionId = readSessionId(req.headers.cookie);
  const session = sessionId ? await sessionStore.get(sessionId) : null;
  const traceParent = resolveTraceParent(req);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers[name];
    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }
  headers.set(TRACEPARENT_HEADER, traceParent);
  if (session) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const upstreamUrl = `${GATEWAY_BASE_URL}${req.originalUrl.replace(/^\/api\/bff\/gateway/, '')}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    res.status(upstreamResponse.status);
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstreamResponse.headers.get(name);
      if (value) {
        res.setHeader(name, value);
      }
    }

    if (upstreamResponse.status === 204) {
      res.end();
      return;
    }

    const body = await upstreamResponse.text();
    res.send(body);
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl, traceParent }, 'Gateway proxy request failed');
    res.status(502).json({ code: 'upstream_unavailable', message: 'A dependent service is unavailable.' });
  }
});
