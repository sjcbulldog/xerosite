import { Controller, Get, Patch, Delete, Param, Body, UseGuards, NotFoundException, UnauthorizedException, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IsString, IsEmail, IsBoolean, IsOptional, IsArray, ValidateNested, MaxLength, IsNumber, MinLength, Matches } from 'class-validator';
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

class AdminChangePasswordDto {
  @IsString()
  newPassword: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private transformToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      fullName: user.fullName,
      primaryEmail: user.primaryEmail,
      state: user.state,
      isSiteAdmin: user.isSiteAdmin,
      emails: user.emails || [],
      phones: user.phones || [],
      addresses: user.addresses || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(user => this.transformToUserResponse(user));
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.transformToUserResponse(user);
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
      return this.transformToUserResponse(user);
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
      return this.transformToUserResponse(user);
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
      return this.transformToUserResponse(user);
    } catch (error) {
      console.error('Error updating user state:', error);
      throw error;
    }
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      const user = await this.usersService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Verify current password
      const isValidPassword = await user.validatePassword(changePasswordDto.currentPassword);
      if (!isValidPassword) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Update password
      await this.usersService.updatePassword(id, changePasswordDto.newPassword);

      return { message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  @Patch(':id/admin-password')
  async adminChangePassword(
    @Param('id') id: string,
    @Body() adminChangePasswordDto: AdminChangePasswordDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      // Verify the requesting user is an admin
      const requestingUser = await this.usersService.findById(req.user.id);
      if (!requestingUser || requestingUser.state !== 'admin') {
        throw new UnauthorizedException('Only administrators can change other users passwords');
      }

      const user = await this.usersService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Update password without requiring current password
      await this.usersService.updatePassword(id, adminChangePasswordDto.newPassword);

      return { message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing user password:', error);
      throw error;
    }
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      // Verify the requesting user is an admin
      const requestingUser = await this.usersService.findById(req.user.id);
      if (!requestingUser || requestingUser.state !== 'admin') {
        throw new UnauthorizedException('Only administrators can delete users');
      }

      const user = await this.usersService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Prevent users from deleting themselves
      if (id === req.user.id) {
        throw new BadRequestException('You cannot delete your own account');
      }

      await this.usersService.remove(id);

      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}
