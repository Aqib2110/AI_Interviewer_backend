import { NextFunction, Request, Response, Router } from "express";
import { isolateTenant } from "../middleware/tenant.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { sessionContext } from "../middleware/session.middleware";
import { authMiddlware } from "../middleware/auth.middleware";
import { emailQueue } from "../lib/queue";
import { db } from "../prisma/db";
import { randomBytes } from "node:crypto";
export const orgRouter = Router();

orgRouter.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, orgName } = req.body;

    try {
      const result = await db.transaction(async (tx) => {
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

      return res.status(200).json({
        message: "account created successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

orgRouter.post(
  "/organization/subOrg",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR"),
  async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.body;
    try {
      await db.orm.public.SubOrg.create({
        name,
        adminId: (req as any).user.id,
        orgId: (req as any).user.tenantId,
      });

      return res.status(200).json({
        message: "organization created successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

orgRouter.get(
  "/organization/subOrgs",
  authMiddlware,
  isolateTenant,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subOrg = await db.orm.public.SubOrg.where({
        adminId: (req as any).user.id,
        orgId: (req as any).user.tenantId,
      });

      return res.status(200).json({
        subOrg,
      });
    } catch (error) {
      next(error);
    }
  },
);

orgRouter.post(
  "/organization/invitation",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, role } = req.body;

    const tokenHash = randomBytes(16).toString("hex");

    const expiresAt = Temporal.Now.instant().add({
      hours: 24,
    });

    try {
      await db.orm.public.OrgInvitation.create({
        email,
        organizationId: (req as any).user.tenantId,
        role,
        tokenHash,
        expiresAt,
        status: "PENDING",
        createdBy: (req as any).user.id,
      });

     await emailQueue.add("sendInvitationEmail", {
        email,
        tokenHash,
      });

      return res.status(200).json({
        message: `${email} is invited to your organization`,
      });
    } catch (error) {
      next(error);
    }
  },
);

orgRouter.post(
  "/organization/invitation/accept",
  authMiddlware,
  async (req: Request, res: Response, next: NextFunction) => {
    const { tokenHash } = req.body;
    const user = (req as any).user;
 const now = Temporal.Now.instant();
    try {
      const invitation = await db.orm.public.OrgInvitation.where({
        tokenHash,
        email: user.email,
      }).first();

      if (!invitation) {
        return res.status(404).json({
          message: "invitation not found",
        });
      }

    const now = Temporal.Now.instant();

if (Temporal.Instant.compare(now, invitation.expiresAt) > 0) {
  return res.status(401).json({
    message: "invitation expired",
  });
}

      if (invitation.status === "ACCEPTED") {
        return res.status(409).json({
          message: "invitation already accepted",
        });
      }

      await db.transaction(async (tx) => {
        await tx.orm.public.Membership.create({
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
          
        });

        await tx.orm.public.OrgInvitation.where({
            id: invitation.id,
        }).update({
            status: "ACCEPTED",
        });
      });

      return res.status(201).json({
        message: "invitation accepted",
      });
    } catch (error) {
      next(error);
    }
  },
);


orgRouter.put("/organization/member/role", authMiddlware, isolateTenant, sessionContext, authorize("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
const { memberId, role } = req.body;

await db.orm.public.Membership.where({
    userId: memberId,
    organizationId: (req as any).user.tenantId,
}).update({
    role,
})

return res.status(200).json({
    message: "member role updated successfully"
})

})

orgRouter.delete("/organization/member/role", authMiddlware, isolateTenant, sessionContext, authorize("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
const { memberId, role } = req.body;

await db.orm.public.Membership.where({
    userId: memberId,
    organizationId: (req as any).user.tenantId,
    role: role
}).delete();

return res.status(200).json({
    message: "member deleted successfully"
})

})