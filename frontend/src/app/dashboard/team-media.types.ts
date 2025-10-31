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
}

export interface CreateTeamMediaDto {
  title: string;
  year: number;
}

export interface UpdateTeamMediaDto {
  title: string;
  year?: number;
}
