import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TeamLinksService } from './team-links.service';
import { CreateTeamLinkDto, UpdateTeamLinkDto, TeamLinkResponseDto } from './dto/team-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams/:teamId/links')
@UseGuards(JwtAuthGuard)
export class TeamLinksController {
  constructor(private readonly teamLinksService: TeamLinksService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Body() createDto: CreateTeamLinkDto,
    @CurrentUser() user: any,
  ): Promise<TeamLinkResponseDto> {
    return this.teamLinksService.create(teamId, user.id, createDto);
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
  ): Promise<TeamLinkResponseDto[]> {
    return this.teamLinksService.findAllForTeam(teamId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTeamLinkDto,
    @CurrentUser() user: any,
  ): Promise<TeamLinkResponseDto> {
    return this.teamLinksService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.teamLinksService.remove(id, user.id);
  }
}
