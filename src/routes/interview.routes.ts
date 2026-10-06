import { Router, Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import db from "../lib/prisma";
import { isolateTenant } from "../middleware/tenant.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { sessionContext } from "../middleware/session.middleware";
import { OpenAIError } from "../Errors/openi.error";
import { authMiddlware } from "../middleware/auth.middleware";
import {InterviewQueue} from "../lib/queue";
import {emailQueue} from "../lib/queue";
import { createMultipartUpload } from "../lib/s3";
import redis from "../lib/redis";
import { getSignedUrlToS3 } from "../lib/s3";
export const interview = Router();

const sessionConfig = JSON.stringify({
  type: "realtime",
  model: "gpt-realtime-2.1",
  audio: { output: { voice: "marin" } },
});

interview.post(
  "/organization/interview/session/:interviewLink",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const interviewLink = req.params.interviewLink?.toString();

      if (!interviewLink) {
        return res.status(401).json({
          message: "interview link is required",
        });
      }

      const candidateInterview = await db.orm.public.Interview.where({
        InterviewLink: interviewLink,
      }).first();

      if (!candidateInterview) {
        return res.status(404).json({
          message: "no interview found",
        });
      }

      if (candidateInterview.status === "COMPELETED") {
        return res.status(403).json({
          message: "interview is already done",
        });
      }

      const fd = new FormData();

      fd.set("sdp", req.body);
      fd.set("session", sessionConfig);

      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Safety-Identifier": "hashed-user-id",
        },
        body: fd,
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData: any;

        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = {
            error: {
              message: responseText,
            },
          };
        }

        throw new OpenAIError(
          errorData?.error?.message || "OpenAI Realtime API request failed",
          response.status,
          {
            code: errorData?.error?.code,
            type: errorData?.error?.type,
            param: errorData?.error?.param,
          },
        );
      }
      const location = response.headers.get("Location");
      const callId = location?.split("/").pop()?.toString();

      if (!callId) {
        return res.status(500).json({
          message: "call id not found",
        });
      }

const signedUrl = await getSignedUrlToS3(`/organization/${candidateInterview.id}.webm`);


      await db.orm.public.Interview.where({
        id: candidateInterview.id,
      }).update({
        aiSessionId: callId,
        status:"IN_PROGRESS",
        InterviewLink: signedUrl,
        startedAt: Temporal.Now.instant()
      });
      
      await InterviewQueue.add("expire_interview",{
        interviewId: candidateInterview.id
      },{
        delay: 5 * 60 * 1000, 
      });

      res.status(200).json({
        callId:responseText,
        signedUrl
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.post(
  "/user/interview/session",
  authMiddlware,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const interviewId = req.body.interviewId;

      if (!interviewId) {
        return res.status(401).json({
          message: "interviewId is required",
        });
      }

      const candidateInterview = await db.orm.public.Interview.where({
        id: interviewId,
        candidateId: (req as any).user.id
      }).first();

      if (!candidateInterview) {
        return res.status(404).json({
          message: "no interview found",
        });
      }

      if (candidateInterview.status === "COMPELETED") {
        return res.status(403).json({
          message: "interview is already done",
        });
      }

      const fd = new FormData();

      fd.set("sdp", req.body);
      fd.set("session", sessionConfig);

      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Safety-Identifier": "hashed-user-id",
        },
        body: fd,
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData: any;

        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = {
            error: {
              message: responseText,
            },
          };
        }

        throw new OpenAIError(
          errorData?.error?.message || "OpenAI Realtime API request failed",
          response.status,
          {
            code: errorData?.error?.code,
            type: errorData?.error?.type,
            param: errorData?.error?.param,
          },
        );
      }
      const location = response.headers.get("Location");
      const callId = location?.split("/").pop()?.toString();

      if (!callId) {
        return res.status(500).json({
          message: "call id not found",
        });
      }


const signedUrl = await getSignedUrlToS3(`/user/${candidateInterview.id}.webm`);


      await db.orm.public.Interview.where({
        id: candidateInterview.id,
      }).update({
        aiSessionId: callId,
        status:"IN_PROGRESS",
        InterviewLink: signedUrl,
        startedAt: Temporal.Now.instant()
      });
      
      await InterviewQueue.add("expire_interview",{
        interviewId: candidateInterview.id
      },{
        delay: 5 * 60 * 1000, 
      });

      res.status(200).json({
        callId: responseText,
        signedUrl
      });

    } catch (error) {
      next(error);
    }
  },
);

interview.post(
  "/organization/interview",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR"),
  async (req: Request, res: Response, next: NextFunction) => {
    const { title,email, description, skills, companyName, role } = req.body;

    if (!title || !description || !skills) {
      return res.status(401).json({
        message: "title, description, and skills are required",
      });
    }



    
    const slug = randomBytes(16).toString("hex");
    try {
      await db.orm.public.Interview.create({
        title,
        description,
        skills,
        createdBy: (req as any).user.id,
        candidateEmail: email,
        tenantId: (req as any).user.tenantId,
        status: "PENDING",
        slug,
      });

 
await emailQueue.add("sendInterviewEmail", {
        email: email,
        link: `${process.env.FRONTEND_URL}/organization/interview/${slug}`,
        companyName: companyName,
        role: role,
      });

      return res.status(200).json({
        message: "Interview created successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.get(
  "/organization/interviews",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR", "VIEWER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const interviews = await db.orm.public.Interview.where({
        tenantId: (req as any).user.tenantId,
      })
        .select("title", "slug", "candidateEmail", "createdAt", "status")
        .all();

      return res.status(200).json({
        interviews,
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.get(
  "/organization/interview:slug",
  authMiddlware,
  isolateTenant,
  sessionContext,
  authorize("ADMIN", "HR", "VIEWER"),
  async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params.slug?.toString();

    if (!slug) {
      return res.status(401).json({
        message: "slug is required",
      });
    }

    try {
      const candidate = await db.orm.public.Interview.where({
        tenantId: (req as any).user.tenantId,
        slug,
      })
        .include("Message")
        .include("Report")
        .first();

      return res.status(200).json({
        candidate,
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.post(
  "/user/interview",
  authMiddlware,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, skills } = req.body;

    if (!title || !description) {
      return res.status(401).json({
        message: "title and description are required",
      });
    }

    const slug = randomBytes(16).toString("hex");
    try {
      await db.orm.public.Interview.create({
        title,
        description,
        createdBy: (req as any).user.id,
        candidateEmail: (req as any).user.email,
        candidateId: (req as any).user.id,
        tenantId: (req as any).user.tenantId,
        status: "PENDING",
        skills: skills && skills,
        slug,
      });

      return res.status(200).json({
        message: "Interview created successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.get(
  "/user/interviews",
  authMiddlware,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const interviews = await db.orm.public.Interview.where({
        candidateId: (req as any).user.id,
      })
        .select("title", "slug", "candidateEmail", "createdAt", "status")
        .all();

      return res.status(200).json({
        interviews,
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.get(
  "/user/interview:slug",
  authMiddlware,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params.slug?.toString();

    try {
      const candidate = await db.orm.public.Interview.where({
        candidateId: (req as any).user.id,
        slug,
      })
        .include("Message")
        .include("Report")
        .first();

      return res.status(200).json({
        candidate,
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.post(
  "user/interview/message",
  authMiddlware,
  sessionContext,
  async (req: Request, res: Response, next: NextFunction) => {
    const { interviewId, userMsg, assistMsg } = req.body;

    if (!interviewId || !userMsg || !assistMsg) {
      return res.status(400).json({
        message: "interviewId and content and messages are required",
      });
    }

    try {
      await db.orm.public.Message.create({
        senderId: (req as any).user.id,
        interviewId: req.body.interviewId,
        userMsg,
        assistMsg
      });

      return res.status(200).json({
        message: "message sent successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

interview.post(
  "organization/interview/message",
  async (req: Request, res: Response, next: NextFunction) => {
    const { organizationId, userMsg, assistMsg, role, interviewId, interviewLink } = req.body;

    if (!interviewId || !userMsg || !assistMsg || !organizationId || !role) {
      return res.status(400).json({
        message: "interviewId, organizationId,role and  are messages required",
      });
    }

    try {
      const interviewFound = await redis.get(`interview:${interviewId}`);

      if (!interviewFound) {
        const interview = await db.orm.public.Interview.where({
          id: interviewId,
          InterviewLink: interviewLink,
        }).first();

        if (!interview) {
          return res.status(404).json({
            message: "interview not found",
          });
        }
        await redis.set(
          `interview:${interviewId}`,
          JSON.stringify({
            interview: interview?.InterviewLink,
            interviewId: interview?.id,
          }),
          "PX",
          5 * 60 * 1000,
        );
      }
      const interview = interviewFound && JSON.parse(interviewFound);
      if (interview && interview?.interviewLink !== interviewLink) {

      return res.status(400).json({
          message: "token does not match",
        });
        
      }
         

         await db.orm.public.Message.create({
        interviewId: interviewId,
        userMsg,
        assistMsg,
        organizationId: organizationId,
        interviewLink: interviewLink,
      });

      return res.status(200).json({
        message: "message sent successfully",
      });
     
    } catch (error) {
      next(error);
    }
  },
);



interview.post("/interview/upload/start", async(req: Request,res: Response, next: NextFunction)=>{
try {
  const {interviewId} = req.body;

  if(!interviewId){
    return res.status(403).json({
      message:"interviewId is required"
    })
  }
  
const uploadId = await createMultipartUpload(interviewId);


return res.status(200).json({
  uploadId
});

} catch (error) {
  next(error);
}

})
