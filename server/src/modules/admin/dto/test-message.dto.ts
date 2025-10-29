import { IsEnum, IsNotEmpty, IsString, MaxLength, IsEmail, ValidateIf } from 'class-validator';

export enum MessageDeliveryMethod {
  EMAIL = 'email',
  TEXT = 'text',
}

export class TestMessageDto {
  @IsEnum(MessageDeliveryMethod)
  @IsNotEmpty()
  deliveryMethod: MessageDeliveryMethod;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.deliveryMethod === MessageDeliveryMethod.EMAIL)
  @IsEmail({}, { message: 'Must be a valid email address' })
  @ValidateIf((o) => o.deliveryMethod === MessageDeliveryMethod.TEXT)
  recipient: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160, { message: 'Message cannot exceed 160 characters' })
  message: string;
}
