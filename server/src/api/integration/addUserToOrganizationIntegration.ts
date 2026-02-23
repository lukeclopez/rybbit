import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { user, member } from "../../db/postgres/schema.js";
import { randomBytes } from "crypto";

function generateId(len = 32) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(len);
  let id = "";
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

const addUserToOrgIntegrationBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "member", "owner"], {
    errorMap: () => ({ message: "Role must be either admin, member, or owner" }),
  }),
});

type AddUserToOrgIntegrationBody = z.infer<typeof addUserToOrgIntegrationBodySchema>;

interface AddUserToOrgIntegrationParams {
  organizationId: string;
}

/**
 * Add a user to an organization via integration shared secret.
 * This endpoint is protected by verifyIntegrationSecret middleware.
 */
export const addUserToOrganizationIntegration = async (
  request: FastifyRequest<{ Params: AddUserToOrgIntegrationParams; Body: AddUserToOrgIntegrationBody }>,
  reply: FastifyReply
) => {
  try {
    const { organizationId } = request.params;
    
    if (!organizationId) {
      return reply.status(400).send({ error: "Missing required field: organizationId" });
    }

    const validation = addUserToOrgIntegrationBodySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { email, role } = validation.data;

    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!foundUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Check if user is already a member of this specific organization
    const existingMember = await db.query.member.findFirst({
      where: and(eq(member.userId, foundUser.id), eq(member.organizationId, organizationId)),
    });

    if (existingMember) {
      return reply.status(400).send({ error: "User is already a member of this organization" });
    }

    await db.insert(member).values([
      {
        userId: foundUser.id,
        organizationId: organizationId,
        role: role,
        id: generateId(),
        createdAt: new Date().toISOString(),
      },
    ]);

    request.log.info(
      {
        userId: foundUser.id,
        organizationId,
        role,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        action: "add_user_to_org_integration",
      },
      "User added to organization via integration"
    );

    return reply.status(201).send({
      message: "User added to organization successfully",
    });
  } catch (error) {
    request.log.error(error, "Error adding user to organization via integration");
    return reply.status(500).send({ error: "Failed to add user to organization" });
  }
};
