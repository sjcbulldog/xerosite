import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamLink } from './entities/team-link.entity';
import { CreateTeamLinkDto, UpdateTeamLinkDto, TeamLinkResponseDto } from './dto/team-link.dto';
import { UserTeam } from '../teams/entities/user-team.entity';

@Injectable()
export class TeamLinksService {
  constructor(
    @InjectRepository(TeamLink)
    private readonly teamLinkRepository: Repository<TeamLink>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    createDto: CreateTeamLinkDto,
  ): Promise<TeamLinkResponseDto> {
    // Verify user is admin
    await this.verifyAdminPermission(userId, teamId);

    const link = this.teamLinkRepository.create({
      teamId,
      title: createDto.title,
      url: createDto.url,
      displayOrder: createDto.displayOrder ?? 999,
    });

    const saved = await this.teamLinkRepository.save(link);
    return this.transformToResponse(saved);
  }

  async findAllForTeam(teamId: string): Promise<TeamLinkResponseDto[]> {
    const links = await this.teamLinkRepository.find({
      where: { teamId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });

    return links.map((link) => this.transformToResponse(link));
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateTeamLinkDto,
  ): Promise<TeamLinkResponseDto> {
    const link = await this.teamLinkRepository.findOne({ where: { id } });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Verify user is admin
    await this.verifyAdminPermission(userId, link.teamId);

    if (updateDto.title !== undefined) link.title = updateDto.title;
    if (updateDto.url !== undefined) link.url = updateDto.url;
    if (updateDto.displayOrder !== undefined)
      link.displayOrder = updateDto.displayOrder;

    const saved = await this.teamLinkRepository.save(link);
    return this.transformToResponse(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const link = await this.teamLinkRepository.findOne({ where: { id } });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Verify user is admin
    await this.verifyAdminPermission(userId, link.teamId);

    await this.teamLinkRepository.remove(link);
  }

  async createDefaultLink(teamId: string, teamNumber: number): Promise<void> {
    const defaultLinks = [
      {
        teamId,
        title: 'The Blue Alliance',
        url: `https://www.thebluealliance.com/team/${teamNumber}`,
        displayOrder: 0,
      },
      {
        teamId,
        title: 'Statbotics',
        url: `https://www.statbotics.io/team/${teamNumber}`,
        displayOrder: 1,
      },
    ];

    const links = this.teamLinkRepository.create(defaultLinks);
    await this.teamLinkRepository.save(links);
  }

  private async verifyAdminPermission(
    userId: string,
    teamId: string,
  ): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const isAdmin = userTeam.getRolesArray().includes('Administrator');

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only team administrators can manage links',
      );
    }
  }

  private transformToResponse(link: TeamLink): TeamLinkResponseDto {
    return {
      id: link.id,
      teamId: link.teamId,
      title: link.title,
      url: link.url,
      displayOrder: link.displayOrder,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }
}
