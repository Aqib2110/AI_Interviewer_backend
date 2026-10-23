import { Request, Response, NextFunction } from "express";
import {
  createUser as createUserService,
  uploadUserResume as uploadUserResumeService,
  createUserWorkspace as createUserWorkspaceService,
  getUserWorkspaces as getUserWorkspacesService,
  getDashboardData as getDashboardDataService,
  getUserResume as getUserResumeService,
  switchContext as switchContextService,
  getUserOrganizations as getUserOrganizationsService,
  getUserDashOverview as getUserDashOverviewService,
  getPublicReport as getPublicReportService
} from "../services/user.service";
import { AppError } from "../Errors/App.error";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body;
    console.log(name,email,password,"rq.body");
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email and password are required",
      });
    }

    await createUserService(name, email, password);

    return res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const uploadUserResume = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "File is required",
      });
    }
    const { mimetype, originalname, buffer } = req.file;
    const resume = await uploadUserResumeService(
      mimetype,
      originalname,
      buffer,
      (req as any).user.id,
    );

    return res.status(201).json({
      message: "Resume uploaded successfully",
      resumeId: resume.id,
    });
  } catch (error) {
    next(error);
  }
};

export const createUserWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name } = req.body;
  try {
    if (!name) {
      throw new AppError("name is required", 401);
    }

    await createUserWorkspaceService(name, (req as any).user.id);

    return res.status(200).json({
      message: "organization created successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const getUserOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const organizations = await getUserOrganizationsService((req as any).user.id);

    return res.status(200).json({
      organizations
    });
  } catch (error) {
    next(error);
  }
};

export const getUserWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const subOrgs = getUserWorkspacesService((req as any).user.id);

    return res.status(200).json({
      subOrgs,
    });
  } catch (error) {
    next(error);
  }
};


export const getDashboardData = async(req: Request,
  res: Response,
  next: NextFunction
)=>{
try {
  const userId = (req as any).user.id;


const dashboardData = await getDashboardDataService(userId);

return res.status(200).json({
  data:dashboardData
})

} catch (error) {
  next(error)
}

}


export const getUserResume = async(req: Request,
  res: Response,
  next: NextFunction
)=>{
try {
  const id = (req as any).user.id;

const resume = await getUserResumeService(id);
return res.status(200).json({
  resume
})
} catch (error) {
  next(error)
}


}



export const switchContext = async(
   req: Request,
  res: Response,
  next: NextFunction,
)=>{
  try {
    let context:string;
    const {tenantId} = req.body;
    const userId = (req as any).user.id;

    console.log(tenantId,"orgIdsssssssssssssssssssssssssss");
    if(!tenantId)
    {
    await switchContextService(userId);
    context="switched to personal"
    }
    else{
     await switchContextService(userId,tenantId);
    context="organization switched"
    }
 
    return res.status(200).json({
      message:`${context}`
    })
  } catch (error) {
    next(error);
  }
}



export const getUserDashOverview = async(
  req:Request,
  res:Response,
  next:NextFunction
)=>{
try {
  const userId = (req as any).user.id;


const {stats,interviews,resume} = await getUserDashOverviewService(userId);

res.status(200).json({
  stats,
  interviews,
  resume
})
} catch (error) {
  next(error)
}
}



export const getPublicReport = async(
  req:Request,
  res:Response,
  next:NextFunction
)=>{
  try {
    const token = req?.params?.token?.toString();
     if(!token)
     {
      throw new AppError("token is required",401);
     }

  const report = await getPublicReportService(token);
  
      return res.status(200).json({
        report
      });

  } catch (error) {
    next(error)
  }
}

