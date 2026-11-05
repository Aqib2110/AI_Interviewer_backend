import { Router} from 'express';
import { sessionContext } from '../middleware/session.middleware.js';
import { authMiddlware } from '../middleware/auth.middleware.js';
import multer from "multer";
import { createUser, createUserWorkspace, getUserWorkspaces, uploadUserResume,getUserResume,
   getDashboardData, 
   getUserOrganizations,
   getUserDashOverview,
   switchContext,
  getPublicReport} from '../controllers/user.controller.js';

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
  "/public/reports/:token",
  getPublicReport,
);

userRouter.get(
  "/public/interviewInfo/:token",
  getPublicReport,
);




