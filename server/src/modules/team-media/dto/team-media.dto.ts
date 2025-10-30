import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTeamMediaDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class UpdateTeamMediaDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class TeamMediaResponseDto {
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
