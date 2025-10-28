import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserState } from '../enums/user-state.enum';

export class CreateEmailDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emailType?: string = 'personal';

  @IsOptional()
  isPrimary?: boolean = false;
}

export class CreatePhoneDto {
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  countryCode?: string = '+1';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneType?: string = 'mobile';

  @IsOptional()
  isPrimary?: boolean = false;
}

export class CreateAddressDto {
  @IsString()
  @MaxLength(255)
  streetLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetLine2?: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  stateProvince: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  addressType?: string = 'home';

  @IsOptional()
  isPrimary?: boolean = false;
}

export class RegisterUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmailDto)
  @ArrayMaxSize(3)
  emails: CreateEmailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhoneDto)
  @ArrayMaxSize(6)
  phones?: CreatePhoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  @ArrayMaxSize(3)
  addresses?: CreateAddressDto[];

  @IsOptional()
  @IsEnum(UserState)
  state?: UserState;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
