import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';

export class UpdateProfileDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  emails?: Array<{
    id?: string | null;
    email: string;
    emailType: string;
    isPrimary: boolean;
  }>;
  phones?: Array<{
    id?: string | null;
    phoneNumber: string;
    phoneType: string;
    isPrimary: boolean;
  }>;
  addresses?: Array<{
    id?: string | null;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    addressType: string;
    isPrimary: boolean;
  }>;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  }
}
