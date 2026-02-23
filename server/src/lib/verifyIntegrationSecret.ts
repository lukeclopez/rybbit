import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Middleware to verify the integration shared secret.
 * Used to authenticate trusted third-party services.
 */
export async function verifyIntegrationSecret(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const integrationSecret = process.env.INTEGRATION_SECRET;

  if (!integrationSecret) {
    request.log.error("INTEGRATION_SECRET environment variable is not set");
    return reply.status(503).send({ error: "Integration endpoint not configured" });
  }

  const authHeader = request.headers["authorization"];
  const token =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

  if (!token) {
    return reply.status(401).send({ error: "Missing authorization header" });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(token, integrationSecret)) {
    request.log.warn("Invalid integration secret attempt");
    return reply.status(401).send({ error: "Invalid integration secret" });
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
