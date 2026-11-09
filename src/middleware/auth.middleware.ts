import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export const authMiddlware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
     const allowedOrigins = process.env.FRONTEND_URLS
      ?.split(",")
      .map(origin => origin.trim().replace(/\/$/, ""));

    if (!allowedOrigins?.length) {
      return res.status(500).json({
        message: "FRONTEND_URL is not configured",
      });
    }

    const requestOrigin = req.headers.origin;

    if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
      return res.status(403).json({
        message: "Origin not allowed",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization header is missing or invalid",
      });
    }

    const token = authHeader.slice(7).trim();

    console.log("token",token,"token")

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
      });
    }

    const authUser = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      sessionId: string;
      name: string;
      email: string;
    };

    (req as any).user = authUser;
    //@ts-ignore
    console.log(authUser,"authUsers")
    next();
  } catch (error) {
    next(error);
  }
};