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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto, TeamMemberDto, AddTeamMemberDto, UpdateTeamMemberRolesDto, UpdateMemberStatusDto, UpdateMemberAttributesDto } from './dto/team-response.dto';
import { SendInvitationDto, TeamInvitationResponseDto } from './dto/team-invitation.dto';
import { UpdateRoleConstraintsDto } from './dto/role-constraints.dto';
import { ImportRosterDto, ImportRosterResultDto } from './dto/import-roster.dto';
import { ExportUsersDto } from './dto/export-users.dto';
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

  @Get('statistics')
  async getSiteStatistics(): Promise<{ publicTeamsCount: number; privateTeamsCount: number; totalUsersCount: number }> {
    return this.teamsService.getSiteStatistics();
  }

  @Get('admin/all')
  async getAllTeams(@CurrentUser() user: any): Promise<TeamResponseDto[]> {
    if (!user.isSiteAdmin) {
      throw new Error('Unauthorized: Only site administrators can view all teams');
    }
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
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    await this.teamsService.remove(id, user.id);
    return { message: 'Team deleted successfully' };
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

  @Patch(':teamId/members/:userId/attributes')
  async updateMemberAttributes(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateMemberAttributesDto,
  ): Promise<TeamMemberDto> {
    return this.teamsService.updateMemberAttributes(teamId, userId, user.id, updateDto);
  }

  @Get(':id/constraints')
  async getRoleConstraints(@Param('id') id: string): Promise<{ constraints: Array<[string, string]> }> {
    const constraints = await this.teamsService.getRoleConstraints(id);
    return { constraints };
  }

  @Patch(':id/constraints')
  async updateRoleConstraints(
    @Param('id') id: string,
    @Body() updateConstraintsDto: UpdateRoleConstraintsDto,
  ): Promise<{ constraints: Array<[string, string]> }> {
    const pairs = updateConstraintsDto.constraints.map(c => [c.role1, c.role2] as [string, string]);
    const constraints = await this.teamsService.updateRoleConstraints(id, pairs);
    return { constraints };
  }

  @Post(':id/import-roster')
  async importRoster(
    @Param('id') id: string,
    @Body() importRosterDto: ImportRosterDto,
  ): Promise<ImportRosterResultDto> {
    return this.teamsService.importRoster(id, importRosterDto);
  }

  @Post(':id/export/users')
  async exportUsers(
    @Param('id') id: string,
    @Body() exportDto: ExportUsersDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.teamsService.exportUsersToCSV(
      id,
      user.id,
      exportDto.fields,
      exportDto.includeSubteams,
    );

    const team = await this.teamsService.findOne(id);
    const filename = `team_${team.teamNumber}_users_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }
}
