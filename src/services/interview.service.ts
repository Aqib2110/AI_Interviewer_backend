import { db } from "../prisma/db.js";
import { InterviewQueue } from "../lib/queue.js";
import { AppError } from "../Errors/App.error.js";
import { randomBytes } from "crypto";
import redis from "../lib/redis.js";
import { geminiLiveSession } from "../lib/gemini.js";
import { getSignedUrlFromS3, multiPartCompleted } from "../lib/s3.js";
import { or, and } from "@prisma/orm-postgres/orm-client";
import { createMultipartUpload } from "../lib/s3.js";
import { interviewRemainingTime } from "../lib/Time.js";
import { randomUUID } from "node:crypto";

export const createOrgInterviewSession = async (slug: string, recordingMode: string, mimeType: string, deviceType: string) => {
  const candidateInterview = await db.orm.public.Interview
    .where({ slug })
    .include("user")
    .first();

  if (!candidateInterview) {
    throw new AppError("no interview found", 404);
  }

  if (!candidateInterview.skills?.length) {
    throw new AppError("skills are required", 401);
  }

  if (candidateInterview.status === "COMPELETED") {
    throw new AppError("interview is already done", 403);
  }

  if (
  candidateInterview.expiresAt &&
  Date.now() >= candidateInterview.expiresAt.epochMilliseconds
) {
  throw new AppError("interview has expired", 403);
}

  if (candidateInterview.status === "PENDING") {
    const now = Temporal.Now.instant();
    const durationMinutes = candidateInterview.durationMinutes || 8;
    const expiresAt = now.add({ seconds: Math.round(durationMinutes * 60) });

    await db.transaction(async (tx: any) => {
      const interview = await tx.orm.public.Interview
        .where({
          id: candidateInterview.id,
          startedAt: null,
          status: "PENDING",
        })
        .update({
          status: "IN_PROGRESS",
          startedAt: now,
          expiresAt
        });

      if (!interview) {
        throw new AppError("interview is already in progress", 409);
      }

      await tx.orm.public.Notification.create({
        tenantId: candidateInterview.tenantId,
        actorId: candidateInterview.user.id,
        targetUserId: interview.candidateId,
        type: "INTERVIEW_STARTED",
        message: `${candidateInterview.candidateEmail} has started the interview.`,
      });
    });

    const id = randomUUID();


    const job = await InterviewQueue.add(
      "expire_interview",
      {
        interviewId: candidateInterview.id,
      },
      {
        jobId: `expire_interview_${id}_${candidateInterview.id}`,
        delay: 4 * 60 * 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
        },
      }
    );
    console.log("JOB CREATED:", {
      id: job.id,
      name: job.name,
      delay: job.opts.delay,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
    });
    console.log("JOB STATE:", await job.getState());

  }

  const sessionResumptionHandle =
    candidateInterview.sessionResumptionHandle ?? null;
  const remTime = candidateInterview.startedAt ? interviewRemainingTime(candidateInterview) : null;

  const token = await geminiLiveSession(
    candidateInterview?.description,
    candidateInterview?.skills,
    candidateInterview?.durationMinutes,
    remTime
  );

  const id = randomUUID();
  const videoKey = `interviews/${candidateInterview?.id}/${id}/recording.webm`;

  const segment = await db.orm.public.InterviewSegment.create({
    interviewId: candidateInterview.id,
    videoKey,
    recordingMode,
    mimeType,
    deviceType
  });

  const elapsedSeconds = candidateInterview.startedAt
    ? Math.max(
      0,
      Math.floor(
        (Date.now() - candidateInterview.startedAt.epochMilliseconds) / 1000
      )
    )
    : null;

  const interview_duration = candidateInterview?.durationMinutes || 8;

  return { token, sessionResumptionHandle, elapsedSeconds, segmentId: segment.id, interview_duration };

};


export const interviewSegmentComplete = async (uploadId: string, segmentId: string) => {
  const interviewSegment = await db.orm.public.InterviewSegment.where({
    id: segmentId,
    uploadId
  }).first();
  if (!interviewSegment) {
    throw new AppError("interview segment not found", 403)
  }
  const videoKey = interviewSegment?.videoKey;
  await multiPartCompleted(videoKey, uploadId);
}


export const createSessionResumptionUpdate = async (handle: string, interviewId: string) => {
  return await db.orm.public.Interview.where({
    id: interviewId
  }).update({
    sessionResumptionHandle: handle
  });
}

export const createUserInterviewSession = async (
  slug: string,
  userId: number,
  recordingMode: string,
  mimeType: string,
  deviceType: string
) => {
  const candidateInterview = await db.orm.public.Interview.where({
    slug: slug,
    createdBy: userId,
  }).first();

  if (!candidateInterview) {
    throw new AppError("no interview found", 404);
  }

  if (!candidateInterview?.skills?.length) {
    throw new AppError("skills are required", 401);
  }

  if (candidateInterview.status === "COMPELETED") {
    throw new AppError("interview is already done", 403);
  }
  
   if (
  candidateInterview.expiresAt &&
  Date.now() >= candidateInterview.expiresAt.epochMilliseconds
) {
  throw new AppError("interview has expired", 403);
}




  if (candidateInterview.status === "PENDING") {
     const now = Temporal.Now.instant();
    const durationMinutes = candidateInterview.durationMinutes || 8;
    const expiresAt = now.add({ seconds: Math.round(durationMinutes * 60) });
    const interview = await db.orm.public.Interview.where({
      id: candidateInterview.id,
      status: "PENDING",
      startedAt: null
    }).update({
      status: "IN_PROGRESS",
      startedAt: Temporal.Now.instant(),
      expiresAt
    });

    if (!interview) {
      throw new AppError("interview is already in progress", 409)
    }

    await InterviewQueue.add(
      "expire_interview",
      {
        interviewId: candidateInterview.id,
      },
      {
        jobId: `expire_interview_${candidateInterview.id}`,
        delay: (candidateInterview.durationMinutes + 2) * 60 * 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
        },
      }
    );
  }

  const sessionResumptionHandle =
    candidateInterview.sessionResumptionHandle ?? null;
  const remTime = candidateInterview.startedAt ? interviewRemainingTime(candidateInterview) : null;

  const id = randomUUID();
  const videoKey = `interviews/${candidateInterview?.id}/${id}/recording.webm`;

  const token = await geminiLiveSession(
    candidateInterview?.description,
    candidateInterview?.skills,
    candidateInterview?.durationMinutes,
    remTime
  );


    const segment = await db.orm.public.InterviewSegment.create({
    interviewId: candidateInterview.id,
    videoKey,
    recordingMode,
    mimeType,
    deviceType
  });

  const elapsedSeconds = candidateInterview.startedAt
    ? Math.max(
      0,
      Math.floor(
        (Date.now() - candidateInterview.startedAt.epochMilliseconds) / 1000
      )
    )
    : null;
  const interview_duration = candidateInterview?.durationMinutes || 8;

  return { token, sessionResumptionHandle, elapsedSeconds, segmentId: segment.id, interview_duration };
};

export const createOrgInterview = async (
  title: string,
  description: string,
  skills: [],
  userId: number,
  email: string,
  orgId: string,
  slug: string,
  role: string,
  compName: string,
  durationMinutes: number,
) => {
  return db.transaction(async (tx: any) => {
    const interview = await tx.orm.public.Interview.create({
      title,
      description,
      skills,
      createdBy: userId,
      candidateEmail: email,
      tenantId: orgId,
      status: "PENDING",
      role,
      compName,
      slug,
      durationMinutes,
    });

    await tx.orm.public.Notification.create({
      actorId: userId,
      tenantId: orgId,
      type: "INTERVIEW",
      message: `Interview created for ${email} by ${userId}`,
    });

    return interview;
  });
};

export const getOrgInterviews = async (tenantId: string) => {
  return await db.orm.public.Interview.where({
    tenantId: tenantId,
  })
    .select("title", "slug", "candidateEmail", "createdAt", "status")
    .all();
};

export const getOrgInterviewDetails = async (
  tenantId: string,
  slug: string,
) => {
  const interview = await db.orm.public.Interview.where({
    tenantId,
    slug,
  })
    .select(
      "id",
      "title",
      "description",
      "role",
      "compName",
      "score",
      "status",
      "skills",
      "createdAt",
      "tenantId",
      "endedAt",
    )
    .include("InterviewSegment")
    .include("interviewcandidate")
    .include("Message")
    .include("Report")
    .first();

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  let videoUrls = [];
  if (interview?.InterviewSegment) {
    for (const key of interview?.InterviewSegment) {
      const videoKey = key?.videoKey || null;
      const url = videoKey ? await getSignedUrlFromS3(videoKey) : null;
      videoUrls.push(url)
    }
  }

  return {
    ...interview,
    videoUrls,
  };
};

export const createUserInterview = async (
  title: string,
  description: string,
  userId: number,
  email: string,
  tenantId: string,
  skills: [],
  role: string,
  compName: string,
  durationMinutes: number,
) => {
  const slug = randomBytes(16).toString("hex");

  return await db.orm.public.Interview.create({
    title,
    description,
    createdBy: userId,
    candidateEmail: email,
    candidateId: userId,
    tenantId: tenantId,
    status: "PENDING",
    skills: skills && skills,
    role,
    compName,
    slug,
    durationMinutes,
  });
};

export const getUserInterviews = async (userId: number) => {
  return await db.orm.public.Interview.where((i) =>
    or(
      i.candidateId.eq(userId),
      i.createdBy.eq(userId)
    )
  )
    .select("title", "slug", "candidateEmail", "createdAt", "status")
    .all();
};

export const getUserInterviewDetails = async (userId: number, slug: string) => {
  console.log(userId, slug, "info");
  const interview = await db.orm.public.Interview
    .where((i) =>
      and(
        i.slug.eq(slug),
        or(
          i.candidateId.eq(userId),
          i.createdBy.eq(userId)
        )
      )
    )
    .include("InterviewSegment")
    .include("Message")
    .include("Report")
    .first();

  let videoUrls = [];
  if (interview?.InterviewSegment) {
    for (const key of interview?.InterviewSegment) {
      const videoKey = key?.videoKey || null;
      const url = videoKey ? await getSignedUrlFromS3(videoKey) : null;
      videoUrls.push(url)
    }
  }

  return {
    ...interview,
    videoUrls,
  };
};

export const createOrgCandidate = async (
  name: string,
  location: string,
  experience: string,
  phone: string,
  currRole: string,
  slug: string,
  tenantId: string,
) => {
  const interview = await db.orm.public.Interview.where({
    slug,
    tenantId,
  })
    .include("interviewcandidate")
    .first();
  if (!interview) {
    throw new AppError("interview not found", 403);
  }
  if (!interview.tenantId) {
    throw new AppError("interview doesn't belong to any organization", 403);
  }

  if (interview?.interviewcandidate) {
    throw new AppError("candidate already exists", 403);
  }

  await db.orm.public.Candidate.create({
    name,
    location,
    experience,
    phone,
    currRole,
    email: interview.candidateEmail,
    organizationId: interview.tenantId,
    interviewId: interview.id,
  });
};



export const createInterviewUpload = async (interviewId: string, segmentId: string) => {
  const segment = await db.orm.public.InterviewSegment.where({
    id: segmentId,
    interviewId
  }).first();

  if (!segment) {
    throw new AppError("segment not found", 401)
  }
  const uploadId = await createMultipartUpload(segment?.videoKey);

  await db.orm.public.InterviewSegment.where({
    id: segmentId,
    interviewId
  }).update({
    uploadId
  });

  return uploadId;
};


export const createUserInterviewMsg = async (
  senderId: number,
  interviewId: string,
  userMsg: string,
  aiMsg: string,
  askedAt: Date,
  segmentId: string,
  askedAtMs: number
) => {
  const cacheKey = `interview:${interviewId}`;

  let interview = await redis.get(cacheKey);

  if (!interview) {
    const interviewRecord = await db.orm.public.Interview.where({
      id: interviewId,
      createdBy: senderId,
    }).first();

    if (!interviewRecord) {
      throw new AppError("interview not found", 404);
    }

    interview = JSON.stringify({
      slug: interviewRecord.slug,
      interviewId: interviewRecord.id,
      createdBy: interviewRecord.createdBy,
    });

    await redis.set(cacheKey, interview, "PX", 5 * 60 * 1000);
  }

  const cachedInterview = JSON.parse(interview);

  if (
    cachedInterview.interviewId !== interviewId ||
    cachedInterview.createdBy !== senderId
  ) {
    throw new AppError("unauthorized interview access", 403);
  }

  return db.orm.public.Message.create({
    senderId,
    interviewId,
    userMsg,
    aiMsg,
    askedAt: Temporal.Instant.from(askedAt),
    askedAtMs,
    segmentId
  });
};

export const createOrgInterviewMsg = async (
  interviewId: string,
  slug: string,
  userMsg: string,
  aiMsg: string,
  organizationId: string,
  askedAt: Date,
  segmentId: string,
  askedAtMs: number
) => {
  const cacheKey = `interview:${organizationId}:${interviewId}`;

  let cachedInterview = await redis.get(cacheKey);

  if (!cachedInterview) {
    const interview = await db.orm.public.Interview.where({
      id: interviewId,
      slug,
      tenantId: organizationId,
    }).first();

    if (!interview) {
      throw new AppError("interview not found", 404);
    }

    cachedInterview = JSON.stringify({
      interviewId: interview.id,
      slug: interview.slug,
      organizationId: interview.tenantId,
    });

    await redis.set(
      cacheKey,
      cachedInterview,
      "PX",
      5 * 60 * 1000,
    );
  }

  const interview = JSON.parse(cachedInterview);

  if (
    interview.interviewId !== interviewId ||
    interview.slug !== slug ||
    interview.organizationId !== organizationId
  ) {
    throw new AppError("unauthorized interview access", 403);
  }

  return db.orm.public.Message.create({
    interviewId,
    userMsg,
    aiMsg,
    organizationId,
    askedAt: Temporal.Instant.from(askedAt),
    askedAtMs,
    segmentId
  });
};
