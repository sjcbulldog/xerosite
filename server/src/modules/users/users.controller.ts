import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';
import { IsString, IsEmail, IsBoolean, IsOptional, IsArray, ValidateNested, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class EmailDto {
  @IsOptional()
  id?: string | number | null;

  @IsEmail()
  email: string;

  @IsString()
  emailType: string;

  @IsBoolean()
  isPrimary: boolean;
}

class PhoneDto {
  @IsOptional()
  id?: string | number | null;

  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsString()
  phoneType: string;

  @IsBoolean()
  isPrimary: boolean;
}

class AddressDto {
  @IsOptional()
  id?: string | number | null;

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

  @IsString()
  addressType: string;

  @IsBoolean()
  isPrimary: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  emails?: EmailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones?: PhoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      fullName: user.fullName,
      primaryEmail: user.primaryEmail,
      state: user.state,
      emails: user.emails || [],
      phones: user.phones || [],
      addresses: user.addresses || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      fullName: user.fullName,
      primaryEmail: user.primaryEmail,
      state: user.state,
      emails: user.emails || [],
      phones: user.phones || [],
      addresses: user.addresses || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Patch(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.updateProfile(id, updateDto);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return {
        id: user.id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        fullName: user.fullName,
        primaryEmail: user.primaryEmail,
        state: user.state,
        emails: user.emails || [],
        phones: user.phones || [],
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  @Patch(':id/active')
  async toggleActiveStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.updateActiveStatus(id, isActive);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return {
        id: user.id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        fullName: user.fullName,
        primaryEmail: user.primaryEmail,
        state: user.state,
        emails: user.emails || [],
        phones: user.phones || [],
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      console.error('Error updating user active status:', error);
      throw error;
    }
  }

  @Patch(':id/state')
  async updateUserState(
    @Param('id') id: string,
    @Body('state') state: string,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.updateUserState(id, state as any);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return {
        id: user.id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        fullName: user.fullName,
        primaryEmail: user.primaryEmail,
        state: user.state,
        emails: user.emails || [],
        phones: user.phones || [],
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      console.error('Error updating user state:', error);
      throw error;
    }
  }
}
