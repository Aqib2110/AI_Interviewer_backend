import { NextFunction,Request, Response, Router } from 'express';
import { authHandler } from '../controllers/auth.controller';
import { authMiddlware } from '../middleware/auth.middleware';
import { db } from '../prisma/db';
import jwt from 'jsonwebtoken';
export const auth = Router();


auth.post("/login", authHandler.login);

auth.post("/logout",authMiddlware, async (req:Request,res: Response,next: NextFunction)=>{
const userId = (req as any).user.id;

try {
    await db.orm.public.Session.where({
    userId
}).delete();

res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "logged out successfully",
    });
} catch (error) {
    next(error)
}

})


auth.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          message: "refresh token is required",
        });
      }

      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET!
      ) as {
        id: string;
        name: String;
        email: String;
      };

      const session = await db.orm.public.Session
        .where({
          userId: Number(payload.id),
        })
        .first();

      if (!session) {
        return res.status(401).json({
          message: "session has been revoked",
        });
      }

      const accessToken = jwt.sign(
        {
          id: payload.id,
          session: session.id,
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: "15m",
        }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      return res.status(200).json({
        message: "access token refreshed",
      });
    } catch (error) {
      next(error);
    }
  }
);