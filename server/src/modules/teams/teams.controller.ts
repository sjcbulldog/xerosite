import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto, TeamMemberDto, AddTeamMemberDto, UpdateTeamMemberRolesDto, UpdateMemberStatusDto } from './dto/team-response.dto';
import { SendInvitationDto, TeamInvitationResponseDto } from './dto/team-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async create(@Body() createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    return this.teamsService.findAll();
  }

  @Get('public/available')
  async findPublicTeams(@CurrentUser() user: any): Promise<TeamResponseDto[]> {
    return this.teamsService.findPublicTeamsForUser(user.id);
  }

  // Invitation Management - must come before :id routes
  @Get('invitations/user')
  async getUserInvitations(@CurrentUser() user: any): Promise<TeamInvitationResponseDto[]> {
    return this.teamsService.getUserInvitations(user.primaryEmail);
  }

  @Post('invitations/:id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<TeamMemberDto> {
    return this.teamsService.acceptInvitation(id, user.id);
  }

  @Post('invitations/:id/decline')
  async declineInvitation(@Param('id') id: string): Promise<TeamInvitationResponseDto> {
    return this.teamsService.declineInvitation(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TeamResponseDto> {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.teamsService.remove(id);
  }

  @Post(':id/invitations')
  async sendInvitation(
    @Param('id') id: string,
    @Body() sendInvitationDto: SendInvitationDto,
    @CurrentUser() user: any,
  ): Promise<TeamInvitationResponseDto> {
    return this.teamsService.sendInvitation(id, sendInvitationDto, user.id);
  }

  @Get(':id/invitations')
  async getTeamInvitations(@Param('id') id: string): Promise<TeamInvitationResponseDto[]> {
    return this.teamsService.getTeamInvitations(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddTeamMemberDto,
  ): Promise<TeamMemberDto> {
    return this.teamsService.addMember(id, addMemberDto);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string): Promise<TeamMemberDto[]> {
    return this.teamsService.getTeamMembers(id);
  }

  @Post(':id/request-join')
  async requestToJoin(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<TeamMemberDto> {
    return this.teamsService.requestToJoin(id, user.id);
  }

  // Simplified Role Management - just returns array of role names
  @Get(':id/roles')
  async getTeamRoles(@Param('id') id: string): Promise<string[]> {
    return this.teamsService.getTeamRoles(id);
  }

  @Patch(':teamId/members/:userId')
  async updateMemberRoles(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() updateRolesDto: UpdateTeamMemberRolesDto,
  ): Promise<TeamMemberDto> {
    return this.teamsService.updateMemberRoles(teamId, userId, updateRolesDto.roles);
  }

  @Delete(':teamId/members/:userId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.teamsService.removeMember(teamId, userId);
  }

  @Patch(':teamId/members/:userId/status')
  async updateMemberStatus(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() updateStatusDto: UpdateMemberStatusDto,
  ): Promise<TeamMemberDto> {
    return this.teamsService.updateMemberStatus(teamId, userId, updateStatusDto);
  }
}
