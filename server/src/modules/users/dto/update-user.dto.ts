import { PartialType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './register-user.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(RegisterUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
