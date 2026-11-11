import { Request, Response, NextFunction } from "express";
import {
  createOrganization as createOrganizationService,
  createOrgWorkspace as createOrgWorkspaceService,
  getOrgWorkspaces as getOrgWorkspacesService,
  createOrgInvitation as createOrgInvitationService,
  orgInvitationAccept as orgInvitationAcceptService,
  deleteOrgMemberRole as deleteOrgMemberRoleService,
  updateOrgMemberRole as updateOrgMemberRoleService,
  getOrgDashOverview as getOrgDashOverviewService,
  getOrgCandidates as getOrgCandidatesService,
  getCandidateInfo as getCandidateInfoService,
  getOrgMembers as getOrgMembersService,
  getOrgInvitations as getOrgInvitationsService,
  resendOrgInvitation as resendOrgInvitationService
} from "../services/org.service.js";
import { AppError } from "../Errors/App.error.js";

export const createOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, password, orgName } = req.body;

  try {
    await createOrganizationService(name, email, password, orgName);

    return res.status(200).json({
      message: "account created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const createOrgWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name } = req.body;
  try {
    await createOrgWorkspaceService(
      name,
      (req as any).user.id,
      (req as any).user.tenantId,
    );

    return res.status(200).json({
      message: "organization created successfully",
    });
  } catch (error) {
    next(error);
  }
};





export const getOrgWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const subOrg = await getOrgWorkspacesService(
      (req as any).user.id,
      (req as any).user.tenantId,
    );

    return res.status(200).json({
      subOrg,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrgInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, role } = req.body;
  try {
    await createOrgInvitationService(
      email,
      (req as any).user.tenantId,
      (req as any).user.id,
      role,
    );

    return res.status(200).json({
      message: `${email} is invited to your organization`,
    });
  } catch (error) {
    next(error);
  }
};



export const orgInvitationAccept = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { tokenHash } = req.body;

  if (!tokenHash) {
    throw new AppError("tokenHash is required", 401);
  }
  const userId = (req as any).user.id;
  const email = (req as any).user.email;
  try {
  const membership = await orgInvitationAcceptService(userId, email, tokenHash);

    return res.status(201).json({
      message: "invitation accepted",
      membership

    });
  } catch (error) {
    next(error);
  }
};

export const resendOrgInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { invitationId } = req.body;
  try {
  const invitation = await resendOrgInvitationService(
      invitationId,
      (req as any).user.tenantId,
      (req as any).user.id
    );

    return res.status(200).json({
      message: "Invitation resent successfully",
      invitation
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrgMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { memberId, role } = req.body;

  if (!memberId || !role) {
    throw new AppError("memberId and role are required", 401);
  }

  try {
    await updateOrgMemberRoleService(
      memberId,
      role,
      (req as any).user.tenantId,
    );

    return res.status(200).json({
      message: "member role updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrgMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { memberId } = req.body;
  const userId  = (req as any).user.id;

  if (!memberId ) {
    throw new AppError("memberId is required", 401);
  }

  try {
    await deleteOrgMemberRoleService(
      memberId,
      (req as any).user.tenantId,
      userId
    );

    return res.status(200).json({
      message: "member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const getOrgDashOverview = async(
   req: Request,
  res: Response,
  next: NextFunction,
)=>{
  try {
    console.log("back reachesssssssssssssssssssssssssssssssssssssssssssssss");
    const orgId = req.params.orgId?.toString();
    if(!orgId)
    {
      throw new AppError("orgId is required",401);
    }
    const currtenantId = (req as any).user.tenantId;

    if(orgId !== currtenantId)
    {
      throw new AppError("switch to the correct tenant",401);
    }

    const {stats,interviews} = await getOrgDashOverviewService(currtenantId);

    return res.status(200).json({
    stats,interviews
    })
  } catch (error) {
    next(error);
  }
}


export const getCandidateInfo = async(
    req: Request,
  res: Response,
  next: NextFunction,
)=>{
 try {
   const id = req.params.id?.toString();

  if(!id)
  {
    throw new AppError("id is required",403);
  }

  const candidate = await getCandidateInfoService(id);

  return res.status(200).json({
    candidate
  })
 } catch (error) {
    next(error)
 }

}


export const getOrgInvitations = async(
    req: Request,
  res: Response,
  next: NextFunction,
)=>{
 try {

const userId = (req as any).user.id;
const tenantId = (req as any).user.tenantId;
 const invitations = await getOrgInvitationsService(userId,tenantId);

    return res.status(200).json({
     invitations
    })
  } catch (error) {
    next(error);
  }
}

export const getOrgMembers = async(
    req: Request,
  res: Response,
  next: NextFunction,
)=>{
 try {
    const tenantId = (req as any).user.tenantId;

 const members = await getOrgMembersService(tenantId,(req as any).user.id);

    return res.status(200).json({
     members
    })
  } catch (error) {
    next(error);
  }
}





export const getOrgCandidates = async(
   req: Request,
  res: Response,
  next: NextFunction,
)=>{
 try {
    const tenantId = (req as any).user.tenantId;

 const candidates = await getOrgCandidatesService(tenantId);

    return res.status(200).json({
     candidates
    })
  } catch (error) {
    next(error);
  }
}
