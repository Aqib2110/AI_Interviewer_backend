import { Request, Response, NextFunction } from "express";
import db from "../lib/prisma";
import redis from "../lib/redis";

export const isolateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
const tenantId = req.headers["x-tenant-id"]?.toString();
   console.log(tenantId,"tenantId from frontend");
  let tenant;
  if (!userId || !tenantId) {
    return res.status(401).json({
      message: "both userId and tenantId are required",
    });
  }

  try {
    const tenantFound = await redis.get(`tenant:${userId}:${tenantId}`);

    if (!tenantFound) {
      tenant = await db.orm.public.Membership.where({
        userId: userId,
        organizationId: tenantId,
      }).first();

      if (!tenant) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      await redis.set(
        `tenant:${tenant?.userId}:${tenant?.organizationId}`,
        JSON.stringify({
          userId: tenant.userId,
          organizationId: tenant.organizationId,
          role: tenant.role,
        }),
        "PX",
        1000 * 60 * 60 * 24 * 7,
      );
    }

    (req as any).user.tenantId = tenantFound
      ? JSON.parse(tenantFound).organizationId
      : tenant?.organizationId;

    (req as any).user.role = tenantFound
      ? JSON.parse(tenantFound).role
      : tenant?.role;
      const redisId = tenantFound ? JSON.parse(tenantFound).organizationId : null;
      console.log(tenant?.organizationId,"db validated id ");
     console.log(redisId,"redis validated id ");
      next();
  } catch (error) {
    next(error);
  }
};
