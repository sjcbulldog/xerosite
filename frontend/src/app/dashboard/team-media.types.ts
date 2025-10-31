export interface TeamMedia {
  id: string;
  teamId: string;
  userId: string;
  fileId: string;
  title: string;
  year: number | null;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploaderName: string;
  createdAt: Date;
  updatedAt: Date;
  userGroupId: string | null;
  userGroupName: string | null;
}

export interface CreateTeamMediaDto {
  title: string;
  year: number;
  userGroupId?: string;
}

export interface UpdateTeamMediaDto {
  title: string;
  year?: number;
  userGroupId?: string | null;
}
