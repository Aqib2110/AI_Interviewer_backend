import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/App.error";
import { emailQueue } from "../lib/queue";
import { randomBytes } from "crypto";
import {
  createOrgInterviewSession as createOrgInterviewSessionService,
  createUserInterviewSession as createUserInterviewSessionService,
  createOrgInterview as createOrgInterviewService,
  getOrgInterviews as getOrgInterviewsService,
  getOrgInterviewDetails as getOrgInterviewDetailsService,
  createUserInterview as createUserInterviewService,
  getUserInterviews as getUserInterviewsService,
  createUserInterviewMsg as createUserInterviewMsgService,
  createOrgInterviewMsg as createOrgInterviewMsgService,
  createOrgCandidate as createOrgCandidateService,
  getUserInterviewDetails as getUserInterviewDetailsService,
} from "../services/interview.service";
import {
  createMultipartUpload,
  uploadPart,
  multiPartCompleted,
} from "../lib/s3";
import { tryCatch } from "bullmq";

export const createOrgInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.body.slug;

    if (!slug) {
      return res.status(401).json({
        message: "interview slug is required",
      });
    }

    const token = await createOrgInterviewSessionService(slug);

    res.status(200).json({
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const createUserInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.body.slug;

    if (!slug) {
      return res.status(401).json({
        message: "interviewId is required",
      });
    }

    const token = createUserInterviewSessionService(slug, (req as any).user.id);

    res.status(200).json({
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrgInterview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { title, email, description, skills, compName, role } = req.body;

  if (!title || !description || !skills) {
    return res.status(401).json({
      message: "title, description, and skills are required",
    });
  }

  const slug = randomBytes(16).toString("hex");
  try {
    await createOrgInterviewService(
      title,
      description,
      skills,
      (req as any).user.id,
      email,
      (req as any).user.tenantId,
      slug,
      role,
      compName,
    );

    await emailQueue.add("sendInterviewEmail", {
      email: email,
      link: `${process.env.FRONTEND_URL}/organization/interview/${slug}`,
      companyName: compName,
      role: role,
    });

    return res.status(200).json({
      message: "Interview created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgInterviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interviews = await getOrgInterviewsService(
      (req as any).user.tenantId,
    );

    return res.status(200).json({
      interviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgInterviewDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const slug = req.params.slug?.toString();

  if (!slug) {
    return res.status(401).json({
      message: "slug is required",
    });
  }

  try {
    const candidate = await getOrgInterviewDetailsService(
      (req as any).user.tenantId,
      slug,
    );

    return res.status(200).json({
      candidate,
    });
  } catch (error) {
    next(error);
  }
};

export const createUserInterview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { title, description, skills, role, compName } = req.body;

  if (!title || !description) {
    return res.status(401).json({
      message: "title and description are required",
    });
  }

  try {
    await createUserInterviewService(
      title,
      description,
      (req as any).user.id,
      (req as any).user.email,
      (req as any).user.tenantId,
      skills,
      role,
      compName,
    );

    return res.status(200).json({
      message: "Interview created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getUserInterviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interviews = await getUserInterviewsService((req as any).user.id);

    return res.status(200).json({
      interviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserInterviewDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      throw new AppError("slug is required", 401);
    }
    const candidate = await getUserInterviewDetailsService(
      (req as any).user.id,
      slug.toString(),
    );

    return res.status(200).json({
      candidate,
    });
  } catch (error) {
    next(error);
  }
};

export const createUserInterviewMsg = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { interviewId, userMsg, aiMsg } = req.body;

  if (!interviewId || !userMsg || !aiMsg) {
    return res.status(400).json({
      message: "interviewId and content and messages are required",
    });
  }

  try {
    await createUserInterviewMsgService(
      (req as any).user.id,
      interviewId,
      userMsg,
      aiMsg,
    );

    return res.status(200).json({
      message: "message created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const createOrgInterviewMsg = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { organizationId, userMsg, aiMsg, interviewId, slug } = req.body;

  if (!interviewId || !userMsg || !aiMsg || !organizationId || !slug) {
    return res.status(400).json({
      message: "interviewId, organizationId,role and  are messages required",
    });
  }

  try {
    await createOrgInterviewMsgService(
      interviewId,
      slug,
      userMsg,
      aiMsg,
      organizationId,
    );
    return res.status(200).json({
      message: "message created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const createInterviewUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(403).json({
        message: "interviewId is required",
      });
    }

    const uploadId = await createMultipartUpload(interviewId);

    return res.status(200).json({
      uploadId,
    });
  } catch (error) {
    next(error);
  }
};

export const createInterviewVideoSignedUrls = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { interviewId, uploadId, startPart, count } = req.body;

    if (!interviewId || !uploadId || !startPart || !count) {
      return res.status(403).json({
        message: "interviewId,uploadId, startPart and count is required",
      });
    }

    const urls = await uploadPart(interviewId, uploadId, startPart, count);

    return res.status(200).json({
      count,
      startPart,
      urls,
    });
  } catch (error) {
    next(error);
  }
};

export const createInterviewVideoComplete = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { interviewId, uploadId, parts } = req.body;

    if (!interviewId || !uploadId || !parts.length) {
      return res.status(403).json({
        message: "interviewId,uploadId and parts are required",
      });
    }

    const result = await multiPartCompleted(interviewId, uploadId, parts);

    res.status(200).json({
      message: "Upload completed successfully",
      key: result.Key,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrgCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, location, experience, phone, currRole,slug,tenantId } = req.body;
  if(!name || !experience || !currRole || !slug || !tenantId)
  {
    throw new AppError("name, experience ,role ,slug and tenantId are all required",401);
  }
  try {
    await createOrgCandidateService(name,location,experience,phone,currRole,slug,tenantId);

    return res.status(200).json({
      message: "candidate created successfully",
    });
  } catch (error) {
    next(error);
  }
};
