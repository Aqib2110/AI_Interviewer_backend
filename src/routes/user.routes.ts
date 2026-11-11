import { Router} from 'express';
import { sessionContext } from '../middleware/session.middleware.js';
import { authMiddlware } from '../middleware/auth.middleware.js';
import multer from "multer";
import { createUser, createUserWorkspace, getUserWorkspaces, uploadUserResume,getUserResume,
   getDashboardData, 
   getUserOrganizations,
   getUserDashOverview,
   switchContext,
    getUserInvitations,
    getUserInvitation,
    getUserNotifications,
    readUserNotification,
  getPublicReport} from '../controllers/user.controller.js';
import { isolateTenant } from '../middleware/tenant.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const userRouter = Router();

userRouter.post("/auth/user/signup", createUser )

userRouter.get("/overview",authMiddlware,sessionContext, getDashboardData);

userRouter.post(
  "/user/resume/upload",
  authMiddlware,
  sessionContext,
  upload.single("file"),
  uploadUserResume,
);


userRouter.post("/user/workspace",authMiddlware,sessionContext, createUserWorkspace)

userRouter.get("/user/organizations",authMiddlware, getUserOrganizations)


userRouter.get("/user/workspaces",authMiddlware,sessionContext, getUserWorkspaces)

userRouter.get("/user/resume",authMiddlware,sessionContext, getUserResume)

userRouter.post(
  "/user/context/switch",
  authMiddlware,
  switchContext
);

userRouter.get(
  "/user/dashboard/overview",
  authMiddlware,
  sessionContext,
  getUserDashOverview,
);

userRouter.get(
  "/user/invitations",
  authMiddlware,
  getUserInvitations,
);


userRouter.get(
  "/user/notifications",
  authMiddlware,
  isolateTenant,
  sessionContext,
  getUserNotifications,
);

userRouter.post(
  "/user/notification",
  authMiddlware,
  isolateTenant,
  sessionContext,
  readUserNotification,
);




userRouter.get(
  "/user/invitation/:token",
  authMiddlware,
  getUserInvitation,
);


userRouter.get(
  "/public/reports/:token",
  getPublicReport,
);

userRouter.get(
  "/public/interviewInfo/:token",
  getPublicReport,
);




