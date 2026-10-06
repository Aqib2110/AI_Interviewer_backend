import { Request, Response, NextFunction } from "express";
import { db } from "../prisma/db";
import redis from "../lib/redis";

export const sessionContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = (req as any).user.session;
    let session;
    const sessionFound = await redis.get(`session:${sessionId}`);

    if (!sessionFound) {
      session = await db.orm.public.Session.where({
        id: sessionId,
      }).first();

      if (!session) {
        return res.status(401).json({
          message: "session not found",
        });
      }

      await redis.set(
        `session:${session.id}`,
        JSON.stringify({
          currentTenantId: session.currentTenantId,
        }),
        "PX",
        1000 * 60 * 60 * 24 * 7,
      );
    }

    const requestedTenantId = (req as any).user.tenantId;
    const currentTenantId = sessionFound
      ? JSON.parse(sessionFound).currentTenantId
      : session?.currentTenantId;

    if (!requestedTenantId && !currentTenantId) {
      return next();
    }

    if (
      currentTenantId != requestedTenantId
    ) {
      return res.status(401).json({
        message:
          "wrong organization, please switch to the correct organization",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
