import { Router, Request, Response, NextFunction } from 'express';
import  db  from '../lib/prisma';
import { sessionContext } from '../middleware/session.middleware';
import { authMiddlware } from '../middleware/auth.middleware';
import { ResumeQueue } from '../lib/queue';
import multer from "multer";
import { uploadFileToS3 } from '../lib/s3';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const userRouter = Router();

userRouter.post("/signup", async (req, res, next) => {
try {
    const { name, email, password } = req.body;
if(!name || !email || !password) {
    return res.status(400).json({
        message: "name, email and password are required"
    })}
await db.orm.public.User.create({
    name,
    email,
    password
})

return res.status(201).json({
    message: "User created successfully"
})
} catch (error) {
    next(error);
}

})


userRouter.post(
  "/user/resume",
  authMiddlware,
  sessionContext,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "File is required",
        });
      }

      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Only PDF and DOCX files are allowed",
        });
      }

      const key = `user/documents/${crypto.randomUUID()}-${req.file.originalname}`;

      await uploadFileToS3(
        key,
        req.file.buffer,
        req.file.mimetype,
      );

      const resume = await db.orm.public.Resume.create({
        userId: (req as any).user.id,
        fileUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
        fileKey: key,
        status: "PENDING"
      });

      await ResumeQueue.add("process_Resume", {
        resumeId: resume.id,
        userId: (req as any).user.id,
        fileKey: key,
        fileType: req.file.mimetype
      });

      return res.status(201).json({
        message: "Resume uploaded successfully",
        resumeId: resume.id,
      });
    } catch (error) {
      next(error);
    }
  },
);


userRouter.post("/user/subOrg",authMiddlware,sessionContext, async (req:Request ,res: Response,next: NextFunction)=>{
const { name } = req.body;
try {
    await db.orm.public.SubOrg.create({
    name,
    adminId: (req as any).user.id
})

return res.status(200).json({
    message: "organization created successfully"
})
}
catch(error)
{
next(error)
}}
)

userRouter.get("/user/subOrgs",authMiddlware,sessionContext, async (req:Request ,res: Response,next: NextFunction)=>{
try {
  const subOrgs = await db.orm.public.SubOrg.where({
    adminId: (req as any).user.id
})

return res.status(200).json({
    subOrgs
})

}
catch(error)
{
next(error)
}}
)