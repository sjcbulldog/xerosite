import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from './entities/user-preference.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesResponseDto } from './dto/preferences-response.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly preferencesRepository: Repository<UserPreference>,
  ) {}

  async getPreferences(userId: string): Promise<PreferencesResponseDto> {
    console.log('getPreferences called with userId:', userId);
    
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      console.log('Creating new preferences for userId:', userId);
      const newPreferences = this.preferencesRepository.create({
        userId: userId,
        eventNotifications: [],
        messageDeliveryMethod: 'email',
      });
      console.log('New preferences object:', newPreferences);
      preferences = await this.preferencesRepository.save(newPreferences);
    }

    return this.toResponseDto(preferences);
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        eventNotifications: [],
        messageDeliveryMethod: 'email',
      });
    }

    // Update fields if provided
    if (updateDto.eventNotifications !== undefined) {
      preferences.eventNotifications = updateDto.eventNotifications;
    }

    if (updateDto.messageDeliveryMethod !== undefined) {
      preferences.messageDeliveryMethod = updateDto.messageDeliveryMethod;
    }

    const savedPreferences = await this.preferencesRepository.save(preferences);
    return this.toResponseDto(savedPreferences);
  }

  private toResponseDto(preferences: UserPreference): PreferencesResponseDto {
    return {
      id: preferences.id,
      userId: preferences.userId,
      eventNotifications: preferences.eventNotifications || [],
      messageDeliveryMethod: preferences.messageDeliveryMethod,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }
}
