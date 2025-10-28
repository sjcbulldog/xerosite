import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RoleConstraintPairDto {
  @IsString()
  role1: string;

  @IsString()
  role2: string;
}

export class UpdateRoleConstraintsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConstraintPairDto)
  constraints: RoleConstraintPairDto[];
}

export class RoleConstraintsResponseDto {
  constraints: Array<[string, string]>;
}
