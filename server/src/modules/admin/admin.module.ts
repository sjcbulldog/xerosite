import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { UserLogin } from '../auth/entities/user-login.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserLogin]), EmailModule, SmsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
