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
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOrQueryAuthGuard } from '../auth/guards/jwt-or-query-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamMediaService } from './team-media.service';
import {
  CreateTeamMediaDto,
  UpdateTeamMediaDto,
  TeamMediaResponseDto,
} from './dto/team-media.dto';

@Controller('teams/:teamId/media')
export class TeamMediaController {
  constructor(private readonly teamMediaService: TeamMediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ): Promise<TeamMediaResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Transform FormData fields to proper types
    const createDto: CreateTeamMediaDto = {
      title: body.title,
      year: parseInt(body.year, 10),
    };

    // Add userGroupId if provided
    if (body.userGroupId) {
      createDto.userGroupId = body.userGroupId;
    }

    // Validate the transformed DTO
    if (!createDto.title || !createDto.title.trim()) {
      throw new BadRequestException('Title is required');
    }

    if (
      isNaN(createDto.year) ||
      createDto.year < 1900 ||
      createDto.year > 2100
    ) {
      throw new BadRequestException(
        'Year must be a valid number between 1900 and 2100',
      );
    }

    return this.teamMediaService.uploadFile(teamId, user.id, file, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ): Promise<TeamMediaResponseDto[]> {
    return this.teamMediaService.findAllForTeam(teamId, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateTitle(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    return this.teamMediaService.updateTitle(id, user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.teamMediaService.remove(id, user.id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType } =
      await this.teamMediaService.downloadFile(id, user.id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  @Get(':id/preview')
  @UseGuards(JwtOrQueryAuthGuard)
  async previewFile(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType, fileSize } =
      await this.teamMediaService.downloadFile(id, user.id);

    // Support for HTTP Range requests (needed for video streaming)
    const range = req.headers.range;

    if (range && mimeType.startsWith('video/')) {
      // Parse range header (format: "bytes=start-end")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Set 206 Partial Content status
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Send the requested chunk
      res.send(data.slice(start, end + 1));
    } else {
      // Send entire file for non-video or non-range requests
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(data);
    }
  }
}
