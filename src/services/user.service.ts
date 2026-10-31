import { db } from "../prisma/db";
import { ResumeQueue } from "../lib/queue";
import { uploadFileToS3 } from "../lib/s3";
import { AppError } from "../Errors/App.error";
import redis from "../lib/redis";


type UserDashOverview = {
  stats: {
    total: number;
    avgScore: number | null;
  };
  interviews: unknown[];
  resume: {} | null;
};

export const createUser = async (
  name: string,
  email: string,
  password: string,
) => {
  return await db.orm.public.User.create({
    name,
    email,
    password,
  });
};

export const uploadUserResume = async (
  mimetype: any,
  fileName: string,
  buffer: Buffer,
  userId: number,
) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(mimetype)) {
    throw new AppError("Only PDF and DOCX files are allowed", 400);
  }

  const key = `user/documents/${crypto.randomUUID()}-${fileName}`;
  console.log(key,"key");

  await uploadFileToS3(key, buffer, mimetype);

  const resume = await db.orm.public.Resume.create({
    userId: userId,
    fileUrl: `${process.env.R2_ENDPOINT}/${key}`,
    fileKey: key,
    status: "PENDING",
  });
  console.log(resume.fileUrl,"fileUrl");

  await ResumeQueue.add("process_Resume", {
    resumeId: resume.id,
    userId: userId,
    fileKey: key,
    fileType: mimetype,
  });

  return resume;
};

export const createUserWorkspace = async (name: string, userId: number) => {
  return await db.orm.public.Workspace.create({
    name,
    adminId: userId,
  });
};

export const getUserWorkspaces = async (userId: number) => {
  return await db.orm.public.Workspace.where({
    adminId: userId,
  });
};

export const switchContext = async(userId:number,newOrgId?:string)=>{

  if(newOrgId)
  {
     const membership = await db.orm.public.Membership.where({
    userId: userId,
    organizationId: newOrgId
   }).first();

   if(!membership)
   {
    throw new AppError("membership not found",404);
   }
  }
 const session = await db.orm.public.Session.where({
    userId: userId
  }).update({
     currentTenantId: newOrgId ? newOrgId : null
  });
  await redis.del(`session:${session?.id}`);
}


export const getDashboardData = async(userId:number)=>{
return await db.orm.public.User.where({
  id:userId
}).include("interviews").include("createdInterviews").first();
}



export const getUserResume = async(id:number)=>{
  return await db.orm.public.Resume.where({
    userId: id
  }).all();
}


export const getUserOrganizations = async(userId:number)=>{
return await db.orm.public.Membership.where({
  userId
}).include("organization").all();
}


export const getUserDashOverview = async(userId:number): Promise<UserDashOverview>=>{

  const stats = await db.orm.public.Interview.where({
    createdBy: userId
  }).aggregate((agg)=>({
  total: agg.count(),
  avgScore: agg.avg("score")
}));

  const interviews = await db.orm.public.Interview.where({
    createdBy: userId
  }).all();

  const resume = await db.orm.public.Resume.where({
    userId,
  }).first();

  return {stats,interviews,resume};

}



export const getPublicReport = async (token: string) => {
  return await db.orm.public.Interview
    .where({ slug: token })
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
      "endedAt")
      .include("interviewcandidate")
    .include("Message")
    .include("Report")
    .first();
};