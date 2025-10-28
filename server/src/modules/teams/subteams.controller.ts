import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubteamsService } from './subteams.service';
import {
  CreateSubteamDto,
  UpdateSubteamDto,
  AddSubteamMembersDto,
  RemoveSubteamMemberDto,
  UpdateLeadPositionDto,
  SubteamResponseDto,
} from './dto/subteam.dto';

@Controller('teams/:teamId/subteams')
@UseGuards(JwtAuthGuard)
export class SubteamsController {
  constructor(private readonly subteamsService: SubteamsService) {}

  @Post()
  async createSubteam(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body() createDto: CreateSubteamDto,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.createSubteam(teamId, req.user.id, createDto);
  }

  @Get()
  async getTeamSubteams(@Param('teamId') teamId: string): Promise<SubteamResponseDto[]> {
    return this.subteamsService.getTeamSubteams(teamId);
  }

  @Get(':subteamId')
  async getSubteam(@Param('subteamId') subteamId: string): Promise<SubteamResponseDto> {
    return this.subteamsService.getSubteam(subteamId);
  }

  @Patch(':subteamId')
  async updateSubteam(
    @Param('subteamId') subteamId: string,
    @Request() req: any,
    @Body() updateDto: UpdateSubteamDto,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.updateSubteam(subteamId, req.user.id, updateDto);
  }

  @Delete(':subteamId')
  async deleteSubteam(
    @Param('subteamId') subteamId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.subteamsService.deleteSubteam(subteamId, req.user.id);
    return { message: 'Subteam deleted successfully' };
  }

  @Post(':subteamId/members')
  async addMembers(
    @Param('subteamId') subteamId: string,
    @Request() req: any,
    @Body() addDto: AddSubteamMembersDto,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.addMembers(subteamId, req.user.id, addDto);
  }

  @Delete(':subteamId/members')
  async removeMember(
    @Param('subteamId') subteamId: string,
    @Request() req: any,
    @Body() removeDto: RemoveSubteamMemberDto,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.removeMember(subteamId, req.user.id, removeDto);
  }

  @Patch(':subteamId/lead-positions')
  async updateLeadPosition(
    @Param('subteamId') subteamId: string,
    @Request() req: any,
    @Body() updateDto: UpdateLeadPositionDto,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.updateLeadPosition(subteamId, req.user.id, updateDto);
  }

  @Delete(':subteamId/lead-positions/:positionId')
  async deleteLeadPosition(
    @Param('subteamId') subteamId: string,
    @Param('positionId') positionId: string,
    @Request() req: any,
  ): Promise<SubteamResponseDto> {
    return this.subteamsService.deleteLeadPosition(subteamId, positionId, req.user.id);
  }
}
