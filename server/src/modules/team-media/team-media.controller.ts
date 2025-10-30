import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamMediaService } from './team-media.service';
import {
  CreateTeamMediaDto,
  UpdateTeamMediaDto,
  TeamMediaResponseDto,
} from './dto/team-media.dto';

@Controller('teams/:teamId/media')
@UseGuards(JwtAuthGuard)
export class TeamMediaController {
  constructor(private readonly teamMediaService: TeamMediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() createDto: CreateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.teamMediaService.uploadFile(teamId, user.id, file, createDto);
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
  ): Promise<TeamMediaResponseDto[]> {
    return this.teamMediaService.findAllForTeam(teamId);
  }

  @Patch(':id')
  async updateTitle(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    return this.teamMediaService.updateTitle(id, user.id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.teamMediaService.remove(id, user.id);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType } =
      await this.teamMediaService.downloadFile(id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }
}
