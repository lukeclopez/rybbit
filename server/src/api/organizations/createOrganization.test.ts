
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrganization } from "./createOrganization.js";
import { FastifyReply, FastifyRequest } from "fastify";

// Mock dependencies
const mockGetUserIdFromRequest = vi.fn();
const mockCreateOrganization = vi.fn();

vi.mock("../../lib/auth-utils.js", () => ({
  getUserIdFromRequest: (...args: any[]) => mockGetUserIdFromRequest(...args),
}));

vi.mock("../../lib/auth.js", () => ({
  auth: {
    api: {
      createOrganization: (...args: any[]) => mockCreateOrganization(...args),
    },
  },
}));

describe("createOrganization", () => {
  let req: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  let sendMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    sendMock = vi.fn().mockReturnThis();
    statusMock = vi.fn().mockReturnThis();
    reply = {
      status: statusMock,
      send: sendMock,
    } as any;
  });

  it("should create organization when input is valid and no owner_user_id provided", async () => {
    mockGetUserIdFromRequest.mockResolvedValue("user-123");
    mockCreateOrganization.mockResolvedValue({
      id: "org-123",
      name: "Test Org",
      slug: "test-org",
    });

    req = {
      body: {
        name: "Test Org",
        slug: "test-org",
      },
    };

    await createOrganization(req as FastifyRequest<any>, reply as FastifyReply);

    expect(mockGetUserIdFromRequest).toHaveBeenCalledWith(req);
    expect(mockCreateOrganization).toHaveBeenCalledWith({
      body: {
        name: "Test Org",
        slug: "test-org",
        userId: "user-123",
      },
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ id: "org-123" }));
  });

  it("should create organization when owner_user_id matches authenticated user", async () => {
    mockGetUserIdFromRequest.mockResolvedValue("user-123");
    mockCreateOrganization.mockResolvedValue({
      id: "org-123",
      name: "Test Org",
      slug: "test-org",
    });

    req = {
      body: {
        name: "Test Org",
        slug: "test-org",
        owner_user_id: "user-123",
      },
    };

    await createOrganization(req as FastifyRequest<any>, reply as FastifyReply);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(mockCreateOrganization).toHaveBeenCalledWith({
      body: {
        name: "Test Org",
        slug: "test-org",
        userId: "user-123",
      },
    });
  });

  it("should reject with 403 when owner_user_id does not match authenticated user", async () => {
    mockGetUserIdFromRequest.mockResolvedValue("user-123");

    req = {
      body: {
        name: "Test Org",
        slug: "test-org",
        owner_user_id: "user-456", // Different user
      },
    };

    await createOrganization(req as FastifyRequest<any>, reply as FastifyReply);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(sendMock).toHaveBeenCalledWith({
      error: "You cannot create an organization for another user",
    });
    expect(mockCreateOrganization).not.toHaveBeenCalled();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetUserIdFromRequest.mockResolvedValue(null);

    req = {
      body: {
        name: "Test Org",
        slug: "test-org",
      },
    };

    await createOrganization(req as FastifyRequest<any>, reply as FastifyReply);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith({ error: "Missing user reference" });
  });

  it("should return 400 if required fields are missing", async () => {
    req = {
      body: {
        name: "Test Org",
        // missing slug
      },
    };

    await createOrganization(req as FastifyRequest<any>, reply as FastifyReply);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(sendMock).toHaveBeenCalledWith({
      error: "Missing required fields: name and slug",
    });
  });
});
