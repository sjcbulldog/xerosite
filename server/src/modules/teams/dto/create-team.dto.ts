import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsArray,
  Matches,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TeamVisibility } from '../enums/team-visibility.enum';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  @Max(30000)
  teamNumber: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    each: true,
    message: 'Role names must contain only alphanumeric characters, spaces, dashes, and underscores',
  })
  roles?: string[];

  @IsOptional()
  @IsEnum(TeamVisibility)
  visibility?: TeamVisibility;
}
