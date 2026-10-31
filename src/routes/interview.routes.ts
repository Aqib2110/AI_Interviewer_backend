import { Router } from "express";
import { isolateTenant } from "../middleware/tenant.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { sessionContext } from "../middleware/session.middleware";
import { authMiddlware } from "../middleware/auth.middleware";

import {
  createOrgInterviewSession,
  createUserInterviewSession,
  createUserInterview,
  createOrgInterview,
  getOrgInterviewDetails,
  getOrgInterviews,
  getUserInterviews,
  getUserInterviewDetails,
  createUserInterviewMsg,
  createOrgInterviewMsg,
  createInterviewUpload,
  getInterviewVideoSignedUrls,
  createInterviewVideoComplete,
  createOrgCandidate
} from "../controllers/interview.controller";

export const interview = Router();

interview.post(
  "/organization/interview/session",
  createOrgInterviewSession,
);

interview.post(
  "/user/interview/session",
  authMiddlware,
  sessionContext,
  createUserInterviewSession,
);

interview.post(
  "/organization/interview",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR"),
  createOrgInterview,
);

interview.get(
  "/organization/interviews",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR", "VIEWER"),
  getOrgInterviews,
);

interview.get(
  "/organization/interview/:slug",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR", "VIEWER"),
  getOrgInterviewDetails,
);

interview.post(
  "/user/interview",
  authMiddlware,
  sessionContext,
  createUserInterview,
);

interview.get(
  "/user/interviews",
  authMiddlware,
  sessionContext,
  getUserInterviews,
);


interview.get(
  "/user/interview/:slug",
  authMiddlware,
  sessionContext,
  getUserInterviewDetails,
);

interview.post(
  "/user/interview/message",
  authMiddlware,
  sessionContext,
  createUserInterviewMsg,
);

interview.post("/organization/interview/message", createOrgInterviewMsg);

interview.post("/organization/interview/candidate", createOrgCandidate);


interview.post("/interview/upload/start", createInterviewUpload);

interview.post("/interview/video/sign-url", getInterviewVideoSignedUrls);

interview.post("/interview/upload/complete", createInterviewVideoComplete);

