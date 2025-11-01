import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { MessageDeliveryMethod, TestMessageDto } from './dto/test-message.dto';
import { UserLogin } from '../auth/entities/user-login.entity';
import { LoginHistoryResponseDto, UserLoginDto } from './dto/login-history.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    @InjectRepository(UserLogin)
    private readonly userLoginRepository: Repository<UserLogin>,
  ) {}

  async sendTestMessage(
    testMessageDto: TestMessageDto,
  ): Promise<{ success: boolean; message: string }> {
    const { deliveryMethod, recipient, message } = testMessageDto;

    try {
      if (deliveryMethod === MessageDeliveryMethod.EMAIL) {
        await this.emailService.sendTestEmail(recipient, 'Test Message', message);
        this.logger.log(`Test email sent successfully to ${recipient}`);
        return {
          success: true,
          message: `Test email sent successfully to ${recipient}`,
        };
      } else {
        await this.smsService.sendTextMessage(recipient, message);
        this.logger.log(`Test SMS sent successfully to ${recipient}`);
        return {
          success: true,
          message: `Test SMS sent successfully to ${recipient}`,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send test message: ${error.message}`);
      throw error;
    }
  }

  async getLoginHistory(limit: number = 100): Promise<LoginHistoryResponseDto> {
    try {
      const [logins] = await this.userLoginRepository.findAndCount({
        relations: ['user'],
        order: {
          loginTime: 'DESC',
        },
        take: limit,
      });

      const loginDtos: UserLoginDto[] = logins
        .filter((login) => login.user) // Filter out any records with null users
        .map((login) => ({
          id: login.id,
          userId: login.userId,
          userName: login.user.fullName,
          userEmail: login.user.primaryEmail || '',
          loginTime: login.loginTime,
          ipAddress: login.ipAddress,
          userAgent: login.userAgent,
        }));

      return {
        logins: loginDtos,
        total: loginDtos.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching login history: ${error.message}`);
      // Return empty result instead of throwing
      return {
        logins: [],
        total: 0,
      };
    }
  }

  async recordLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const login = this.userLoginRepository.create({
      userId,
      ipAddress,
      userAgent,
    });

    await this.userLoginRepository.save(login);
    this.logger.log(`Login recorded for user ${userId} from ${ipAddress}`);
  }
}
