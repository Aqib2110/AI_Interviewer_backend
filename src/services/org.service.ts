import { db } from "../prisma/db.js";
import { randomBytes } from "crypto";
import { emailQueue } from "../lib/queue.js";
import { AppError } from "../Errors/App.error.js";
import { and } from "@prisma/orm-postgres/orm-client";

type OrgDashOverview = {
  stats: {
    total: number;
    avgScore: number | null;
  };
  interviews: unknown[];
};

export const createOrganization = async (
  name: string,
  email: string,
  password: string,
  orgName: string,
) => {
  const result = await db.transaction(async (tx: any) => {
    const user = await tx.orm.public.User.create({
      name,
      email,
      password,
    });

    const org = await tx.orm.public.Organization.create({
      name: orgName,
      adminId: user.id,
    });

    const membership = await tx.orm.public.Membership.create({
      userId: user.id,
      organizationId: org.id,
      role: "ADMIN",
    });

    return { org, membership };
  });
};

export const createOrgWorkspace = async (
  name: string,
  userId: number,
  tenantId: string,
) => {
  return await db.orm.public.Workspace.create({
    name,
    adminId: userId,
    orgId: tenantId,
  });
};

export const getOrgWorkspaces = async (adminId: number, orgId: string) => {
  return db.orm.public.Workspace.where({
    adminId: adminId,
    orgId: orgId,
  });
};

export const createOrgInvitation = async (
  email: string,
  orgId: string,
  userId: number,
  role: any,
) => {
  const tokenHash = randomBytes(16).toString("hex");

  const expiresAt = Temporal.Now.instant().add({
    hours: 24,
  });

  await db.orm.public.OrgInvitation.create({
    email,
    organizationId: orgId,
    role,
    tokenHash,
    expiresAt,
    status: "PENDING",
    createdBy: userId,
  });

  await db.orm.public.Notification.create({
    actorId:userId,
    tenantId: orgId,
    type: "INVITATION",
    message: `Invitation sent to ${email} to join organization`,
  });

  await emailQueue.add("sendInvitationEmail", {
    email,
    tokenHash,
  });
};

export const resendOrgInvitation = async (
  invitationId: string,
  orgId: string,
  userId: number,
) => {
  const invitation = await db.orm.public.OrgInvitation.where({
    id: invitationId,
    organizationId: orgId,
    createdBy: userId,
  }).first();

  if (!invitation) {
    throw new AppError("invitation not found", 404);
  }

  if (invitation.status === "ACCEPTED") {
    throw new AppError("invitation already accepted", 409);
  }

  const tokenHash = randomBytes(16).toString("hex");

  const expiresAt = Temporal.Now.instant().add({
    hours: 24,
  });

  const updatedInvitation = await db.orm.public.OrgInvitation.where({
    id: invitationId,
  }).update({
    tokenHash,
    expiresAt,
  });

  await db.orm.public.Notification.create({
    actorId:userId,
    tenantId: orgId,
    type: "INVITATION",
    message: `Invitation resent to ${updatedInvitation?.email} to join organization`,
  });

  await emailQueue.add("sendInvitationEmail", {
    email: invitation.email,
    tokenHash,
  });

  return { ...updatedInvitation };
};

export const orgInvitationAccept = async (
  userId: number,
  email: string,
  tokenHash: string,
) => {
  const invitation = await db.orm.public.OrgInvitation.where({
    tokenHash,
    email: email,
  }).first();

  if (!invitation) {
    throw new AppError("invitation not found", 404);
  }

  const now = Temporal.Now.instant();

  if (Temporal.Instant.compare(now, invitation.expiresAt) > 0) {
    throw new AppError("invitation expired", 401);
  }

  if (invitation.status === "ACCEPTED") {
    throw new AppError("invitation already accepted", 409);
  }

 return await db.transaction(async (tx: any) => {
  const membership = await tx.orm.public.Membership.create({
      organizationId: invitation.organizationId,
      userId: userId,
      role: invitation.role,
    });

 const orgInvitation = await tx.orm.public.OrgInvitation.where({
      id: invitation.id,
    }).include("organization").update({
      status: "ACCEPTED",
    });

    await tx.orm.public.Notification.create({
      targetUserId:userId,
      actorId: orgInvitation.organization.adminId,
      tenantId: invitation.organizationId,
      type: "INVITATION",
      message: `${invitation.email} joined the organization`,
    });

    return membership;
  });
};

export const updateOrgMemberRole = async (
  memberId: number,
  role: any,
  tenantId: string,
) => {
  return await db.transaction(async (tx: any) => {
    const updatedMembership = await tx.orm.public.Membership.where({
      userId: memberId,
      organizationId: tenantId,
    }).include("user").update({
      role,
    });

    await tx.orm.public.Notification.create({
      targetUserId:memberId,
      tenantId: tenantId,
      type: "ROLE_UPDATE",
      message: `${updatedMembership?.user?.name}'s role has been updated to ${role}`,
    });

    return updatedMembership;
  });
};

export const deleteOrgMemberRole = async (memberId: number, orgId: string,userId:number) => {
  return db.transaction(async (tx: any) => {
   await tx.orm.public.Membership.where({
      userId: memberId,
      organizationId: orgId,
    }).delete();

  await tx.orm.public.Session.where({
      userId:memberId
    }).update({
      currentTenantId: null
    });

  const user = await tx.orm.public.User.where({
    id:memberId
  }).first();


    await tx.orm.public.OrgInvitation.where({
      email:user.email,
      organizationId:orgId
    }).delete();

    await tx.orm.public.Notification.create({
      actorId: userId,
      targetUserId: memberId,
      tenantId: orgId,
      type: "ROLE_UPDATE",
      message: `${user?.name} has been removed from the organization`,
    });

  });
};

export const getCandidateInfo = async (id: string) => {
  return db.orm.public.Interview.where((iv) =>
    iv.interviewcandidate.some({ id: id }),
  )
    .include("interviewcandidate")
    .include("Report")
    .all();
};

export const getOrgInvitations = async (userId: number, tenantId: string) => {
  const invitations = await db.orm.public.Organization.where({
    id: tenantId,
    adminId: userId,
  })
    .include("invitations")
    .first();

  return invitations?.invitations;
};

export const getOrgMembers = async (tenantId: string, userId: number) => {
  return db.orm.public.Membership
  .where((m) => and(m.organizationId.eq(tenantId), m.userId.neq(userId)))
  .include("user", (user) => user.select("id","email"))
  .all();

};

export const getOrgDashOverview = async (
  currtenantId: string,
): Promise<OrgDashOverview> => {
  const stats = await db.orm.public.Interview.where({
    tenantId: currtenantId,
  }).aggregate((agg) => ({
    total: agg.count(),
    avgScore: agg.avg("score"),
  }));

  const interviews = await db.orm.public.Interview.where({
    tenantId: currtenantId,
  })
    .include("interviewcandidate")
    .all();

  return { stats, interviews };
};

export const getOrgCandidates = async (tenantId: string) => {
  return await db.orm.public.Candidate.where({
    organizationId: tenantId,
  }).all();
};
