import { db } from "../prisma/db";
import { randomBytes } from "crypto";
import { emailQueue } from "../lib/queue";
import { AppError } from "../Errors/App.error";
import { and } from '@prisma/orm-postgres/orm-client';


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
  const result = await db.transaction(async (tx:any) => {
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
      role: "HR",
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
  return await db.orm.public.Workspace.where({
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

  await emailQueue.add("sendInvitationEmail", {
    email,
    tokenHash,
  });
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

  await db.transaction(async (tx:any) => {
    await tx.orm.public.Membership.create({
      organizationId: invitation.organizationId,
      userId: userId,
      role: invitation.role,
    });

    await tx.orm.public.OrgInvitation.where({
      id: invitation.id,
    }).update({
      status: "ACCEPTED",
    });
  });
};

export const updateOrgMemberRole = async (
  memberId: number,
  role: any,
  tenantId: string,
) => {
  return await db.orm.public.Membership.where({
    userId: memberId,
    organizationId: tenantId,
  }).update({
    role,
  });
};

export const deleteOrgMemberRole = async (
  memberId: number,
  orgId: string,
) => {
  return await db.orm.public.Membership.where({
    userId: memberId,
    organizationId: orgId,
  }).delete();
};


export const getCandidateInfo = async (id: string) => {
  return db.orm.public.Interview
    .where((iv) => iv.interviewcandidate.some({ id: id }))
    .include("interviewcandidate")
    .include("Report")
    .all();
};



export const getOrgInvitations = async(tenantId:string,userId:number)=>{
  return db.orm.public.Organization.where({
    id:tenantId,
    adminId: userId
  }).include("invitations").all();
}



export const getOrgMembers = async (
  tenantId: string,
  userId: number
) => {
  return db.orm.public.Membership
    .where((m) => and(
      m.organizationId.eq(tenantId),
      m.userId.neq(userId),
    ))
    .all();
};




export const getOrgDashOverview = async (currtenantId:string):Promise<OrgDashOverview> =>{
const stats = await db.orm.public.Interview.where({
  tenantId:currtenantId
}).aggregate((agg)=>({
  total: agg.count(),
  avgScore: agg.avg("score")
}));

const interviews = await db.orm.public.Interview
  .where({ tenantId: currtenantId })
  .include("interviewcandidate").all();

  




return {stats,interviews};
}


export const getOrgCandidates = async (tenantId:string)=>{
 return await db.orm.public.Candidate.where({
    organizationId: tenantId
  }).all();
}
