import { IsArray, IsBoolean, IsOptional } from 'class-validator';

export class ExportUsersDto {
  @IsArray()
  @IsOptional()
  fields?: string[];

  @IsBoolean()
  @IsOptional()
  includeSubteams?: boolean;
}
