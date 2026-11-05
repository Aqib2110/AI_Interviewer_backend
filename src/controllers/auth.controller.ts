import { Request, Response, NextFunction } from "express";
import {
  loginService,
  logoutService,
  refreshTokenService,
} from "../services/auth.service.js";
import { AppError } from "../Errors/App.error.js";

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError("email and password are required", 400);
    }

    const { accessToken, refreshToken, user } = await loginService(email, password);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 60 * 60 * 1000,
      path: "/"
    });

     const userInfo = {
        id:user.id,
        name:user.name,
        email:user.email,
        token: accessToken
      };
    return res.status(201).json({
      user:userInfo,
      organizations:user.memberships,
      context:user.session?.currentTenantId,
      message: "User logged in successfully",
    });
  } catch (error) {
    next(error);
  }
};


const logout = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  try {
    await logoutService(userId);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};


const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allowedOrigins = process.env.FRONTEND_URLS
      ?.split(",")
      .map(origin => origin.trim().replace(/\/$/, ""));

    if (!allowedOrigins?.length) {
      throw new AppError("FRONTEND_URL is not defined", 500);
    }

    const requestOrigin = req.headers.origin;

    if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
      throw new AppError("Origin not allowed", 403);
    }

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 401);
    }

    const accessToken = await refreshTokenService(refreshToken);

    return res.status(200).json({
      message: "Access token refreshed",
      token: accessToken
    });
  } catch (error) {
    next(error);
  }
};

export const authController = { login, logout, refresh };
