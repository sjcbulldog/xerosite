export interface SubteamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  addedAt: Date;
}

export interface SubteamLeadPosition {
  id: string;
  title: string;
  requiredRole: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

export interface Subteam {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  validRoles: string[];
  createdBy: string;
  members: SubteamMember[];
  leadPositions: SubteamLeadPosition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubteamRequest {
  name: string;
  description?: string;
  validRoles: string[];
  leadPositions?: {
    title: string;
    requiredRole: string;
    userId?: string;
  }[];
}

export interface UpdateSubteamRequest {
  name?: string;
  description?: string;
  validRoles?: string[];
  leadPositions?: {
    title: string;
    requiredRole: string;
    userId?: string;
  }[];
}
