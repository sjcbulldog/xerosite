import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './create-team.dto';
import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { TeamVisibility } from '../enums/team-visibility.enum';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsString()
  roleConstraints?: string;

  @IsOptional()
  @IsEnum(TeamVisibility)
  visibility?: TeamVisibility;

  @IsOptional()
  @IsString()
  timezone?: string;
}
