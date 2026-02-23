import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { user, member } from "../../db/postgres/schema.js";

const removeUserFromOrgIntegrationBodySchema = z.object({
  memberIdOrEmail: z.string().min(1, "memberIdOrEmail is required"),
});

type RemoveUserFromOrgIntegrationBody = z.infer<typeof removeUserFromOrgIntegrationBodySchema>;

interface RemoveUserFromOrgIntegrationParams {
  organizationId: string;
}

/**
 * Remove a user from an organization via integration shared secret.
 * This endpoint is protected by verifyIntegrationSecret middleware.
 */
export const removeUserFromOrganizationIntegration = async (
  request: FastifyRequest<{ Params: RemoveUserFromOrgIntegrationParams; Body: RemoveUserFromOrgIntegrationBody }>,
  reply: FastifyReply
) => {
  try {
    const { organizationId } = request.params;
    
    if (!organizationId) {
      return reply.status(400).send({ error: "Missing required field: organizationId" });
    }

    const validation = removeUserFromOrgIntegrationBodySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { memberIdOrEmail } = validation.data;

    let targetUserId: string | null = null;
    let targetMemberId: string | null = null;
    
    if (memberIdOrEmail.includes("@")) {
      const foundUser = await db.query.user.findFirst({
        where: eq(user.email, memberIdOrEmail),
      });

      if (!foundUser) {
        return reply.status(404).send({ error: "User not found" });
      }
      targetUserId = foundUser.id;
    } else {
      targetUserId = memberIdOrEmail;
      targetMemberId = memberIdOrEmail;
    }

    const conditions = [];
    if (targetUserId) conditions.push(eq(member.userId, targetUserId));
    if (targetMemberId) conditions.push(eq(member.id, targetMemberId));

    const deletedMember = await db.delete(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          or(...conditions)
        )
      )
      .returning();

    if (deletedMember.length === 0) {
      return reply.status(404).send({ error: "User is not a member of this organization" });
    }

    request.log.info(
      {
        memberIdOrEmail,
        organizationId,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        action: "remove_user_from_org_integration",
      },
      "User removed from organization via integration"
    );

    return reply.status(200).send({
      message: "User removed from organization successfully",
    });
  } catch (error: any) {
    request.log.error(error, "Error removing user from organization via integration");
    return reply.status(error.status || 500).send({ 
      error: error.message || "Failed to remove user from organization" 
    });
  }
};

