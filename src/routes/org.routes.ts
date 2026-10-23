import { Router } from "express";
import { isolateTenant } from "../middleware/tenant.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { sessionContext } from "../middleware/session.middleware";
import { authMiddlware } from "../middleware/auth.middleware";


import {
  createOrganization,
  createOrgInvitation,
  createOrgWorkspace,
  deleteOrgMemberRole,
  getOrgWorkspaces,
  orgInvitationAccept,
  updateOrgMemberRole,
  getOrgDashOverview,
  getOrgCandidates
} from "../controllers/org.controller";

export const orgRouter = Router();

orgRouter.post("/auth/organization/signup", createOrganization);

orgRouter.post(
  "/organization/workspace",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR"),
  createOrgWorkspace,
);

orgRouter.get(
  "/organization/workspaces",
  authMiddlware,
  isolateTenant,
  sessionContext,
  getOrgWorkspaces,
);

orgRouter.post(
  "/organization/invitation",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN"),
  createOrgInvitation,
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
