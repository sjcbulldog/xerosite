import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMedia } from './entities/team-media.entity';
import {
  CreateTeamMediaDto,
  UpdateTeamMediaDto,
  TeamMediaResponseDto,
} from './dto/team-media.dto';
import { FileStorageService } from '../file-storage/file-storage.service';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TeamMediaService {
  constructor(
    @InjectRepository(TeamMedia)
    private readonly teamMediaRepository: Repository<TeamMedia>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async uploadFile(
    teamId: string,
    userId: string,
    file: any,
    createDto: CreateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    // Verify user is a team member
    await this.verifyTeamMembership(userId, teamId);

    // Store the file using FileStorageService
    const storedFile = await this.fileStorageService.storeFile(
      file.buffer,
      file.originalname,
      userId,
      'team-media',
      file.mimetype,
    );

    // Create the team media record
    const teamMedia = this.teamMediaRepository.create({
      teamId,
      userId,
      fileId: storedFile.id,
      title: createDto.title,
    });

    const saved = await this.teamMediaRepository.save(teamMedia);
    return this.transformToResponse(saved);
  }

  async findAllForTeam(teamId: string): Promise<TeamMediaResponseDto[]> {
    const mediaFiles = await this.teamMediaRepository.find({
      where: { teamId },
      relations: ['file', 'user'],
      order: { createdAt: 'DESC' },
    });

    return mediaFiles.map((media) => this.transformToResponse(media));
  }

  async findOne(id: string): Promise<TeamMedia> {
    const media = await this.teamMediaRepository.findOne({
      where: { id },
      relations: ['file', 'user'],
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    return media;
  }

  async updateTitle(
    id: string,
    userId: string,
    updateDto: UpdateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    const media = await this.findOne(id);

    // Only the uploader or team admin can update
    await this.verifyUpdatePermission(userId, media.teamId, media.userId);

    media.title = updateDto.title;
    const saved = await this.teamMediaRepository.save(media);
    return this.transformToResponse(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const media = await this.findOne(id);

    // Only the uploader or team admin can delete
    await this.verifyUpdatePermission(userId, media.teamId, media.userId);

    // Delete the stored file
    await this.fileStorageService.deleteFile(media.fileId);

    // Delete the team media record
    await this.teamMediaRepository.remove(media);
  }

  async downloadFile(id: string): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
    fileSize: number;
  }> {
    const media = await this.findOne(id);

    const { file, data } = await this.fileStorageService.getFile(media.fileId);
    return {
      data,
      filename: file.originalFilename,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  }

  private async verifyTeamMembership(
    userId: string,
    teamId: string,
  ): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }
  }

  private async verifyUpdatePermission(
    userId: string,
    teamId: string,
    uploaderId: string,
  ): Promise<void> {
    // Check if user is the uploader
    if (userId === uploaderId) {
      return;
    }

    // Check if user is team administrator
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const isAdmin = userTeam.getRolesArray().includes('Administrator');

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only the uploader or team administrators can modify this file',
      );
    }
  }

  private transformToResponse(media: TeamMedia): TeamMediaResponseDto {
    return {
      id: media.id,
      teamId: media.teamId,
      userId: media.userId,
      fileId: media.fileId,
      title: media.title,
      originalFilename: media.file?.originalFilename || 'unknown',
      fileSize: media.file?.fileSize || 0,
      mimeType: media.file?.mimeType || 'application/octet-stream',
      uploaderName: media.user?.fullName || 'Unknown User',
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
