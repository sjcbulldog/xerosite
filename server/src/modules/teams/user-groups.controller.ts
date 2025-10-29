import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { CreateUserGroupDto, UpdateUserGroupDto, UserGroupResponseDto } from './dto/user-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams/:teamId/user-groups')
@UseGuards(JwtAuthGuard)
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateUserGroupDto,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupsService.createUserGroup(teamId, user.id, createDto);
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ): Promise<UserGroupResponseDto[]> {
    return this.userGroupsService.getUserGroups(teamId, user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<UserGroupResponseDto> {
    return this.userGroupsService.getUserGroup(id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateUserGroupDto,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupsService.updateUserGroup(id, user.id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.userGroupsService.deleteUserGroup(id, user.id);
  }
}
