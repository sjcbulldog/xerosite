import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [EmailModule, SmsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
