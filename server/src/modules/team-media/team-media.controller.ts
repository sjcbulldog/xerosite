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

  @Get(':id/preview')
  async previewFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType, fileSize } =
      await this.teamMediaService.downloadFile(id);

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
