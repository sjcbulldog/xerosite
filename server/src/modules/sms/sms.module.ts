import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import smsConfig from '../../config/sms.config';

@Module({
  imports: [
    ConfigModule.forFeature(smsConfig),
  ],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
