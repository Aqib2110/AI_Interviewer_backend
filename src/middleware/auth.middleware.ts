import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
let number = 0;
export const authMiddlware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
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
    next();
  } catch (error) {
    next(error);
  }
};