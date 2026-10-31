import { sessionConfig } from "../lib/openai";
import { db } from "../prisma/db";
import { InterviewQueue } from "../lib/queue";
import { OpenAIError } from "../Errors/openi.error";
import { AppError } from "../Errors/App.error";
import { randomBytes } from "crypto";
import redis from "../lib/redis";
import { geminiLiveSession } from "../lib/gemini";
import { getSignedUrlFromS3 } from "../lib/s3";
import { interview } from "../routes/interview.routes";

export const createOrgInterviewSession = async (
  slug: string,
) => {
  const candidateInterview = await db.orm.public.Interview.where({
    slug: slug,
  }).first();

  if (!candidateInterview) {
    throw new AppError("no interview found", 404);
  }

  if(!candidateInterview.skills?.length)
  {
     throw new AppError("skills are required", 401);
  }

  if (candidateInterview.status === "COMPELETED") {
    throw new AppError("interview is already done", 403);
  }

  const token = await geminiLiveSession(candidateInterview?.description,candidateInterview?.skills);

  const now = Temporal.Now.instant(); 

 const videoKey = `interviews/${candidateInterview?.id}/recording.webm`;

  await db.orm.public.Interview.where({
    id: candidateInterview.id,
  }).update({
    aiSessionId: JSON.stringify(token),
    status: "IN_PROGRESS",
    startedAt: now,
    videoKey: videoKey
  });

  await InterviewQueue.add(
    "expire_interview",
    {
      interviewId: candidateInterview.id,
    },
   {
    attempts:3,
    backoff:{
      type:"exponential",
      delay: 2000
    },
    removeOnComplete:{
      age: 60 * 60 *24,
      count: 1000
    },

    removeOnFail:{
      age: 60 * 60 * 24 * 7
    }
   }
  );

  return token;
};

export const createUserInterviewSession = async (
  slug: string,
  userId:number
) => {
  const candidateInterview = await db.orm.public.Interview.where({
    slug:slug,
    createdBy: userId
  }).first();

  if (!candidateInterview) {
    throw new AppError("no interview found", 404);
  }

  if(!candidateInterview?.skills?.length){
    throw new AppError("skills are required", 401);
  }

  if (candidateInterview.status === "COMPELETED") {
    throw new AppError("interview is already done", 403);
  }

  const token = await geminiLiveSession(candidateInterview?.description,candidateInterview?.skills);
 const videoKey = `interviews/${candidateInterview?.id}/recording.webm`;

  await db.orm.public.Interview.where({
    id: candidateInterview.id,
  }).update({
    aiSessionId: JSON.stringify(token),
    status: "IN_PROGRESS",
    startedAt: Temporal.Now.instant(),
    videoKey
  });

  await InterviewQueue.add(
    "expire_interview",
    {
      interviewId: candidateInterview.id,
    },
    {
      delay: 5 * 60 * 1000,
    },
  );

  return token;
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
  compName:string,
  durationMinutes:number
) => {
  return await db.orm.public.Interview.create({
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
    durationMinutes
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
    .include("interviewcandidate")
    .include("Message")
    .include("Report")
    .first();

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  const videoUrl = interview.videoKey
    ? await getSignedUrlFromS3(interview.videoKey)
    : null;

  return {
    ...interview,
    videoUrl,
  };
};


export const createUserInterview = async (
  title: string,
  description: string,
  userId: number,
  email: string,
  tenantId: string,
  skills: [],
  role:string,
  compName:string,
  durationMinutes:number

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
    durationMinutes
  });
};

export const getUserInterviews = async (userId: number) => {
  return await db.orm.public.Interview.where({
    candidateId: userId,
  })
    .select("title", "slug", "candidateEmail", "createdAt", "status")
    .all();
};

export const getUserInterviewDetails = async (userId: number, slug: string) => {
  console.log(userId,slug,"info")
  const interview = await db.orm.public.Interview.where({
    candidateId: userId,
    slug,
  })
    .include("Message")
    .include("Report")
    .first();

    const videoUrl = interview?.videoKey
    ? await getSignedUrlFromS3(interview?.videoKey)
    : null;

  return {
    ...interview,
    videoUrl,
  };

};

export const createOrgCandidate = async(name:string,location:string,experience:string,phone:string,currRole:string,slug:string,tenantId:string)=>{
const interview = await db.orm.public.Interview.where({
  slug,
  tenantId
}).include("interviewcandidate").first();
if(!interview)
{
  throw new AppError("interview not found",403)
}
if(!interview.tenantId)
{
  throw new AppError("interview doesn't belong to any organization",403)
}


if(interview?.interviewcandidate)
{
    throw new AppError("candidate already exists",403)

}

await db.orm.public.Candidate.create({
  name,
  location,
  experience,
  phone,
  currRole,
  email:interview.candidateEmail,
  organizationId:interview.tenantId,
  interviewId:interview.id
})

}

export const createUserInterviewMsg = async (
  senderId: number,
  interviewId: string,
  userMsg: string,
  aiMsg: string,
) => {

   const interviewFound = await redis.get(`interview:${interviewId}`);

  if (!interviewFound) {
    const interview = await db.orm.public.Interview.where({
      id: interviewId,
      createdBy: senderId
    }).first();

    if (!interview) {
      throw new AppError("interview not found", 404);
    }
    await redis.set(
      `interview:${interview?.id}`,
      JSON.stringify({
        slug: interview?.slug,
        interviewId: interview?.id,
      }),
      "PX",
      5 * 60 * 1000,
    );
  }
  const interview = interviewFound && JSON.parse(interviewFound);
  if (interview && interview?.interviewId !== interviewId) {
    throw new AppError("interview id doesn't match", 403);
  }

  await db.orm.public.Message.create({
    senderId: senderId,
    interviewId,
    userMsg,
    aiMsg:aiMsg,
  });

};

export const createOrgInterviewMsg = async (
  interviewId: string,
  slug: string,
  userMsg: string,
  aiMsg: string,
  organizationId: string,
) => {
  const interviewFound = await redis.get(`interview:${interviewId}`);

  if (!interviewFound) {
    const interview = await db.orm.public.Interview.where({
      id: interviewId,
      slug: slug,
      tenantId: organizationId
    }).first();

    if (!interview) {
      throw new AppError("interview not found", 404);
    }
    await redis.set(
      `interview:${interview?.id}`,
      JSON.stringify({
        slug: interview?.slug,
        interviewId: interview?.id,
      }),
      "PX",
      5 * 60 * 1000,
    );
  }
  const interview = interviewFound && JSON.parse(interviewFound);
  if (interview && interview?.slug !== slug) {
    throw new AppError("token does not match", 403);
  }

  await db.orm.public.Message.create({
    interviewId: interviewId,
    userMsg,
    aiMsg:aiMsg,
    organizationId: organizationId
  });
};
