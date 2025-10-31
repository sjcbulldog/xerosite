import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';

export class CreateTeamMediaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsUUID()
  userGroupId?: string;
}

export class UpdateTeamMediaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsUUID('4', { message: 'User group ID must be a valid UUID' })
  userGroupId?: string | null;
}

export class TeamMediaResponseDto {
  id: string;
  teamId: string;
  userId: string;
  fileId: string;
  title: string;
  year: number | null;
  userGroupId: string | null;
  userGroupName: string | null;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploaderName: string;
  createdAt: Date;
  updatedAt: Date;
}
