import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateTeamMediaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;
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
}

export class TeamMediaResponseDto {
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
