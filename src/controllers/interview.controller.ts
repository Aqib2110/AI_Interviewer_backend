import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/App.error.js";
import { emailQueue } from "../lib/queue.js";
import { randomBytes } from "crypto";
import {
  createOrgInterviewSession as createOrgInterviewSessionService,
  createUserInterviewSession as createUserInterviewSessionService,
  createOrgInterview as createOrgInterviewService,
  getOrgInterviews as getOrgInterviewsService,
  getOrgInterviewDetails as getOrgInterviewDetailsService,
  createUserInterview as createUserInterviewService,
  getUserInterviews as getUserInterviewsService,
  interviewSegmentComplete as interviewSegmentCompleteService,
  createUserInterviewMsg as createUserInterviewMsgService,
  createOrgInterviewMsg as createOrgInterviewMsgService,
  createSessionResumptionUpdate as createSessionResumptionUpdateService,
  createInterviewUpload as createInterviewUploadService,
  createOrgCandidate as createOrgCandidateService,
  getUserInterviewDetails as getUserInterviewDetailsService,
} from "../services/interview.service.js";
import {
  multiPartCompleted,
  getNextRecordingPartUrls,
} from "../lib/s3.js";
import { db } from "../prisma/db.js";

export type interviewTypes =
  | "TECHNICAL"
  | "BEHAVIORAL" 
  | "PROJECT_BASED" 
  | "MIXED"
  | "HR"

 export type experienceLevelTypes =
  | "ENTRY_LEVEL"
  | "JUNIOR"
  | "MID_LEVEL"
  | "SENIOR"

export interface EvalutionCriteria{
  name:string;
  weight: number;
  description:string;
}

export const createOrgInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {slug,recordingMode,mimeType,deviceType} = req.body;
   
    if (!slug || !recordingMode || !mimeType || !deviceType) {
      return res.status(400).json({
        message: "interview slug,recording,mime and device type are required",
      });
    }


    const session = await createOrgInterviewSessionService(slug,recordingMode,mimeType,deviceType);

    res.status(200).json({
      ...session,
    });
  } catch (error) {
    next(error);
  }
};


export const createSessionResumptionUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {handle,interviewId} = req.body;
     await createSessionResumptionUpdateService(handle,interviewId);
     return res.status(200).json({
      message:"sessionResumption updated successfully"
     })
  } catch (error) {
    next(error);
  }
}
export const createUserInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {slug,recordingMode,mimeType,deviceType} = req.body;

    if (!slug || !recordingMode || !mimeType || !deviceType) {
      return res.status(401).json({
        message: "interview slug,recording,mime and device type are required",
      });
    }

    const session = await createUserInterviewSessionService(slug,(req as any)?.user?.id,recordingMode,mimeType,deviceType);

    res.status(200).json({
      ...session
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
  const { title, email, description, skills, compName, role,durationMinutes,evalutionCriteria,interviewType,experienceLevel } = req.body;
 const intType:interviewTypes = interviewType;
    const evalCriteria:EvalutionCriteria[] = evalutionCriteria;
    const exprLevel: experienceLevelTypes = experienceLevel;
  if (!title || !email || !description || !skills || !compName || !role || !durationMinutes || !evalutionCriteria.length || !interviewType || !experienceLevel) {
    return res.status(401).json({
      message: "title,email, description,skills,interviewType,experienceLevel and evalutionCriteria are required",
    });
  }

  if(!exprLevel)
  {
     return res.status(400).json({
        message: "experienceLevel is invalid",
      });
  }

   if(!intType)
    {
       return res.status(400).json({
        message: "interviewType is invalid",
      });
    }

    if(!evalCriteria.length){
     return res.status(400).json({
        message: "evaluationCriteria is invalid",
      });
    }

    if(durationMinutes > 15)
    {
       return res.status(400).json({
        message: "interview duration should not exceed 15 minutes",
      });
    }

  const slug = randomBytes(16).toString("hex");
  try {
const interview =  await createOrgInterviewService(
      title,
      description,
      skills,
      (req as any).user.id,
      email,
      (req as any).user.tenantId,
      slug,
      role,
      compName,
      durationMinutes,
      intType,
      evalCriteria,
      exprLevel
    );
    console.log("sending email to:", email);

await emailQueue.add("sendInterviewEmail", {
  email,
  slug,
  companyName: compName,
  role,
});


    return res.status(200).json({
      message: "Interview created successfully",
      interview
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
  const { title, description, skills, compName, role,durationMinutes,evalutionCriteria,interviewType,experienceLevel } = req.body;
 const intType:interviewTypes = interviewType;
    const evalCriteria:EvalutionCriteria[] = evalutionCriteria;
    const exprLevel: experienceLevelTypes = experienceLevel;
  if (!title || !description || !skills || !compName || !role || !durationMinutes || !evalutionCriteria.length || !interviewType || !experienceLevel) {
    return res.status(401).json({
      message: "title, description,skills,interviewType,experienceLevel and evalutionCriteria are required",
    });
  }

  if(!exprLevel)
  {
     return res.status(400).json({
        message: "experienceLevel is invalid",
      });
  }

   if(!intType)
    {
       return res.status(400).json({
        message: "interviewType is invalid",
      });
    }

    if(!evalCriteria.length){
     return res.status(400).json({
        message: "evaluationCriteria is invalid",
      });
    }

    if(durationMinutes > 15)
    {
       return res.status(400).json({
        message: "interview duration should not exceed 15 minutes",
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
      durationMinutes,
      intType,
      evalCriteria,
      exprLevel
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
  const { interviewId, userMsg, aiMsg,askedAt,segmentId,askedAtMs } = req.body;

  if (!interviewId || !userMsg || !aiMsg || !askedAt || !segmentId || !askedAtMs) {
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
      askedAt,
      segmentId,
      askedAtMs
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
  const { organizationId, userMsg, aiMsg, interviewId, slug,askedAt,segmentId,askedAtMs } = req.body;

  if (!interviewId || !userMsg || !aiMsg || !organizationId || !slug || !askedAt || !segmentId || !askedAtMs) {
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
      askedAt,
      segmentId,
      askedAtMs
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
    const { interviewId,segmentId } = req.body;

    if (!interviewId || !segmentId) {
      return res.status(403).json({
        message: "interviewId and segmentid is required",
      });
    }

    const uploadId = await createInterviewUploadService(interviewId,segmentId);

    return res.status(200).json({
      uploadId,
    });
  } catch (error) {
    next(error);
  }
};


export const interviewSegmentComplete = async(
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
     const {uploadId} = req.body;
    const segmentId = req.params.segmentId.toString();


    if (!uploadId || !segmentId) {
      throw new AppError("uploadId and segmentId is required", 401);
    }
    
    await interviewSegmentCompleteService(uploadId, segmentId);

    res.status(200).json({
      message: "Upload completed successfully",
    });

    } catch (error) {
    next(error)
  }
}


export const getInterviewVideoSignedUrls = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { interviewId, uploadId,segmentId } = req.body;

    if (!interviewId || !uploadId ) {
      return res.status(403).json({
        message: "interviewId and uploadId is required",
      });
    }

    const segment = await db.orm.public.InterviewSegment.where({
      interviewId,
      id: segmentId
    }).first();

    if(!segment)
    {
      throw new AppError("segment not found",401)
    }

    const interview = await db.orm.public.Interview.where({
      id:interviewId
    }).first();

    if(!interview)
    {
       throw new AppError("interview not found",401)
    }

 if (
    !interview.startedAt || interview.endedAt || (interview.expiresAt &&
    Date.now() >= interview.expiresAt.epochMilliseconds)
  ) {
    throw new AppError("interview is not active", 403);
  }

    const {
    startPart,
    count,
    urls,
  } = await getNextRecordingPartUrls(segment?.videoKey, uploadId);

    return res.status(200).json({
      startPart,
      count,
      urls,
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
  try {
    const {
      name,
      location,
      experience,
      phone,
      currRole,
      slug,
      tenantId,
    } = req.body;

    if (!name || !experience || !currRole || !slug || !tenantId) {
      throw new AppError(
        "Name, experience, role, slug and tenantId are required",
        400,
      );
    }

    const fileData = req.file
      ? {
          mimetype: req.file.mimetype,
          fileName: req.file.originalname,
          buffer: req.file.buffer,
        }
      : undefined;

    await createOrgCandidateService(
      name,
      location,
      experience,
      phone,
      currRole,
      slug,
      tenantId,
      fileData,
    );

    return res.status(201).json({
      message: "Candidate created successfully",
    });
  } catch (error) {
    next(error);
  }
};
