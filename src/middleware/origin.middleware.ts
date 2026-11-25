import { NextFunction, Request, Response } from "express";

export const validateOrigin = async (req: Request, res: Response, next: NextFunction) => {
 const allowedOrigins = process.env.FRONTEND_URL
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
    next();
}