import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesResponseDto } from './dto/preferences-response.dto';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async getPreferences(@Request() req): Promise<PreferencesResponseDto> {
    console.log('Full req.user object:', JSON.stringify(req.user, null, 2));
    console.log('req.user.id:', req.user?.id);
    return this.preferencesService.getPreferences(req.user.id);
  }

  @Put()
  async updatePreferences(
    @Request() req,
    @Body() updateDto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    console.log('Full req.user object:', JSON.stringify(req.user, null, 2));
    console.log('req.user.id:', req.user?.id);
    return this.preferencesService.updatePreferences(req.user.id, updateDto);
  }
}
