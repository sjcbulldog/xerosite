export interface TeamMedia {
  id: string;
  teamId: string;
  userId: string;
  fileId: string;
  title: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploaderName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamMediaDto {
  title: string;
}

export interface UpdateTeamMediaDto {
  title: string;
}
