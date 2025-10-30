import { IsString, IsUrl, IsOptional, IsInt, Min } from 'class-validator';

export class CreateTeamLinkDto {
  @IsString()
  title: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateTeamLinkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class TeamLinkResponseDto {
  id: string;
  teamId: string;
  title: string;
  url: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
