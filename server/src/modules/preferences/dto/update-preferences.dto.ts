import { IsArray, IsEnum, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EventNotificationDto {
  @IsNumber()
  timeBefore: number;

  @IsEnum(['email', 'text'])
  method: 'email' | 'text';
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventNotificationDto)
  eventNotifications?: EventNotificationDto[];

  @IsOptional()
  @IsEnum(['email', 'text'])
  messageDeliveryMethod?: 'email' | 'text';
}
