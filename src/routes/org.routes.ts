import { Router } from "express";
import { isolateTenant } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { sessionContext } from "../middleware/session.middleware.js";
import { authMiddlware } from "../middleware/auth.middleware.js";


import {
  createOrganization,
  createOrgInvitation,
  deleteOrgMemberRole,
  getOrgInvitations,
  getQueryData,
  orgInvitationAccept,
  updateOrgMemberRole,
  getOrgDashOverview,
  getOrgCandidates,
  getCandidateInfo,
  resendOrgInvitation,
  getOrgMembers
} from "../controllers/org.controller.js";
import { getUserNotifications } from "../controllers/user.controller.js";

export const orgRouter = Router();

orgRouter.post("/auth/organization/signup", createOrganization);

orgRouter.post(
  "/organization/invitation",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("HR","ADMIN"),
  createOrgInvitation,
);

orgRouter.post(
  "/organization/invitation/resend",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("HR","ADMIN"),
  resendOrgInvitation,
);

orgRouter.post(
  "/organization/invitation/accept",
  authMiddlware,
  orgInvitationAccept,
);

orgRouter.put(
  "/organization/member/role",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN"),
  updateOrgMemberRole,
);

orgRouter.delete(
  "/organization/member/role",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN"),
  deleteOrgMemberRole,
);

orgRouter.get(
  "/organization/members",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN","HR"),
  getOrgMembers,
);

orgRouter.get(
  "/organization/notifications",
  authMiddlware,
  isolateTenant,
  sessionContext,
  getUserNotifications,
);

orgRouter.get(
  "/organization/invitations",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN","HR"),
  getOrgInvitations,
);


orgRouter.get(
  "/organization/:orgId/dashboard/overview",
  authMiddlware,
  isolateTenant,
  sessionContext,
  getOrgDashOverview,
);

orgRouter.get(
  "/organization/candidates",
  authMiddlware,
  isolateTenant,
  sessionContext,
  getOrgCandidates
);

orgRouter.get("/organization/candidate/:id",
   authMiddlware,
  isolateTenant,
  sessionContext,
  getCandidateInfo
)


orgRouter.get("/organization/search",
   authMiddlware,
  isolateTenant,
  sessionContext,
  getQueryData
)
