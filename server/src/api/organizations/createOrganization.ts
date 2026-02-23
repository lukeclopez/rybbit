import { FastifyReply, FastifyRequest } from "fastify";
import { APIError } from "better-auth/api";
import { auth } from "../../lib/auth.js";
import { getUserIdFromRequest } from "../../lib/auth-utils.js";

interface CreateOrganizationRequest {
  Body: {
    name: string;
    slug: string;
    owner_user_id?: string;
  };
}

export async function createOrganization(request: FastifyRequest<CreateOrganizationRequest>, reply: FastifyReply) {
  try {
    const { name, slug, owner_user_id } = request.body;

    // Validate required fields
    if (!name || !slug) {
      return reply.status(400).send({
        error: "Missing required fields: name and slug",
      });
    }

    // Get user ID from session or API key
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: "Missing user reference" });
    }

    if (owner_user_id && owner_user_id !== userId) {
      return reply.status(403).send({
        error: "You cannot create an organization for another user",
      });
    }

    // Use BetterAuth's organization creation API for parity with UI
    // This is the same logic that authClient.organization.create() calls
    const result = await auth.api.createOrganization({
      body: {
        name,
        slug,
        userId, // Server-side creation on behalf of this user
      },
    });

    return reply.status(201).send(result);
  } catch (error: any) {
    console.error("Error creating organization:", error);

    // active debugging: log full error object structure
    // console.log("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    const errorMessage = 
      error?.body?.message || 
      error?.message || 
      (typeof error === 'string' ? error : JSON.stringify(error));

    // Handle BetterAuth errors or Postgres unique constraint violations
    // We check this BEFORE checking for generic APIError to ensure we catch duplicates correctly
    if (
      error?.code === "23505" || 
      errorMessage.includes("slug") ||
      errorMessage.includes("already exists") ||
      errorMessage.includes("duplicate key value violates unique constraint") ||
      errorMessage.includes("Unique constraint failed")
    ) {
      return reply.status(409).send({
        error: "An organization with this slug already exists",
      });
    }

    if (error instanceof APIError) {
      return reply.status(Number(error.status) || 500).send({
        error: error.message || "Internal server error",
      });
    }
    
    return reply.status(500).send({
      error: errorMessage || "Internal server error",
    });
  }
}
