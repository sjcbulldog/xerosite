import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { MessageDeliveryMethod, TestMessageDto } from './dto/test-message.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
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
}
