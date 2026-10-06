import { Request, Response, NextFunction } from "express";

type Role = "ADMIN" | "HR" | "VIEWER"

export const authorize =  (...allowedRoles: Role[]) => {

    return (req: Request,res: Response,next: NextFunction)=>{


        if(!allowedRoles.includes((req as any).user.role))
         {
            return res.status(403).json({
                message: "unauthorized"
            })
         }

         next();
    }

}