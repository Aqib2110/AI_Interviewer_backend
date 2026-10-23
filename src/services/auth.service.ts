import { db } from "../prisma/db";
import { AppError } from "../Errors/App.error";
import { generateAccessToken, generateRefreshToken } from "../lib/tokens";
import jwt from "jsonwebtoken";

export const loginService = async (email: string, password: string) => {
const user = await db.orm.public.User.where({ email })
  .include("session")
  .include("memberships", (membership) =>
    membership.include("organization")
  )
  .first();

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.password !== password) {
    throw new AppError("Incorrect email or password", 401);
  }

  const refreshToken = generateRefreshToken({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  const session = user.session
    ? await db.orm.public.Session.where({ id: user.session.id }).update({
        refreshToken,
      })
    : await db.orm.public.Session.create({
        userId: user.id,
        refreshToken,
      });

  const accessToken = generateAccessToken({
    id: user.id,
    sessionId: session?.id,
    name: user.name,
    email: user.email,
  });

  return { accessToken, refreshToken, user };
};

export const logoutService = async (userId: number) => {
  return await db.orm.public.Session.where({
    userId,
  }).delete();
};

export const refreshTokenService = async (refreshToken: string) => {
  let payload: {
    id: string;
    name: string;
    email: string;
  };

  try {
    payload = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET!,
    ) as typeof payload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await db.orm.public.Session.where({
    userId: Number(payload.id),
    refreshToken,
  }).first();

  if (!session) {
    throw new AppError("Session has been revoked", 401);
  }

 const accessToken = generateAccessToken({
    id: payload.id,
    sessionId: session.id,
    name: payload.name,
    email: payload.email,
  });

  return accessToken;
};
