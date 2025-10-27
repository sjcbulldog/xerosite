import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const verificationUrl = `${apiUrl}/api/auth/verify-email?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email Address',
        template: './verification',
        context: {
          firstName,
          verificationUrl,
        },
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to Xerosite!',
        template: './welcome',
        context: {
          firstName,
        },
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      // Don't throw - welcome email failure shouldn't block the process
    }
  }

  async sendTeamInvitationEmail(
    email: string,
    teamName: string,
    teamNumber: number,
  ): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const loginUrl = `${apiUrl}/login`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Invitation to join team: ${teamName}`,
        html: `
          <p>You have been invited to join the team <strong>${teamName}</strong> (Team #${teamNumber}).</p>
          <p>Please log in to accept or decline this invitation:</p>
          <p><a href="${loginUrl}">Click here to log in</a></p>
        `,
      });

      this.logger.log(`Team invitation email sent to ${email} for team ${teamName}`);
    } catch (error) {
      this.logger.error(`Failed to send team invitation email to ${email}`, error);
      throw error;
    }
  }
}
