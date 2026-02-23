import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "../../lib/auth.js";
import { db } from "../../db/postgres/postgres.js";
import { user } from "../../db/postgres/schema.js";

const createApiKeyIntegrationSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  name: z.string().min(1).max(100).optional().default("Integration API Key"),
  expiresIn: z.number().positive().optional(),
});

type CreateApiKeyIntegrationBody = z.infer<typeof createApiKeyIntegrationSchema>;

/**
 * Create an API key for a user via integration shared secret.
 * This endpoint is protected by verifyIntegrationSecret middleware.
 */
export const createApiKeyIntegration = async (
  request: FastifyRequest<{ Body: CreateApiKeyIntegrationBody }>,
  reply: FastifyReply
) => {
  try {
    const validation = createApiKeyIntegrationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { userId, name, expiresIn } = validation.data;

    // Verify the user exists
    const userRecord = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userRecord.length === 0) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Create the API key using BetterAuth
    const apiKey = await auth.api.createApiKey({
      body: {
        name,
        userId,
        expiresIn,
        rateLimitEnabled: true,
        rateLimitTimeWindow: 1000 * 60 * 10, // 10 minutes
        rateLimitMax: 500,
        prefix: "rb_"
      },
    });

    request.log.info(
      {
        userId,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        action: "create_api_key_integration",
      },
      "API key created via integration"
    );

    return reply.status(201).send(apiKey);
  } catch (error) {
    request.log.error(error, "Error creating API key via integration");
    return reply.status(500).send({ error: "Failed to create API key" });
  }
};
