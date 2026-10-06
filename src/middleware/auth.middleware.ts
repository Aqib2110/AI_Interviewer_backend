import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddlware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        message: "authorization Header is missing",
      });
    }
    const token = authHeader.split("Bearer")[1];

    if (!token) {
      return res.status(401).json({
        message: "token is missing",
      });
    }
    const authUser = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      session: string;
      name: string;
      email: string;
    };
    if (!authUser) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }
    // @ts-ignore
    req.user = authUser;

    next();
  } catch (error) {
    next(error);
  }
};
