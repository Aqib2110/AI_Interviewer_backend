import { Request, Response, NextFunction } from "express";
import { db } from "../prisma/db.js";
import redis from "../lib/redis.js";

export const sessionContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
        let session;
    const sessionId = (req as any).user.sessionId;
    console.log("usersss:", (req as any).user);
console.log("sessionId:", (req as any).user?.sessionId);
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
    const redisId = sessionFound
      ? JSON.parse(sessionFound).currentTenantId : null;
    if (!requestedTenantId && !currentTenantId) {
      return next();
    }
    console.log(session?.currentTenantId,"db verified session Id");
    console.log(redisId,"redis verified session id")
    if (requestedTenantId && !currentTenantId) {
      return res.status(401).json({
        message:
          "personal context, switch to an organization",
      });
    }
     console.log(currentTenantId,"curr",requestedTenantId,"req")

       console.log({
  sessionId,
  requestedTenantId,
  currentTenantId,
  source: sessionFound ? "redis" : "database",
});
    if (
      currentTenantId !== requestedTenantId
    ) {
      return res.status(401).json({
        message:
          "wrong context, please switch to the correct organization",
      });
    }


    console.log({
  sessionId,
  requestedTenantId,
  currentTenantId,
  source: sessionFound ? "redis" : "database",
});

    next();
  } catch (error) {
    next(error);
  }
};


