import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailQueue, EmailStatus } from './entities/email-queue.entity';

interface QueueEmailOptions {
  to: string;
  subject: string;
  html?: string;
  template?: string;
  context?: any;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private processingQueue = false;
  private lastProcessTime = 0;
  private emailsSentThisMinute = 0;
  private minuteStartTime = Date.now();

  constructor(
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepository: Repository<EmailQueue>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log('Email service initialized with queue processing');
    const rateLimit = this.configService.get<number>('email.rateLimit', 0);
    const redirectTo = this.configService.get<string>('email.redirectTo');
    const dontSend = this.configService.get<boolean>('email.dontSend', false);

    if (dontSend) {
      this.logger.warn('⚠️  Email sending is DISABLED (EMAIL_DONT_SEND=true)');
    }

    if (redirectTo) {
      this.logger.warn(`⚠️  Email redirect enabled: All emails will be sent to ${redirectTo}`);
    }

    if (rateLimit > 0) {
      this.logger.log(`Rate limit: ${rateLimit} emails per minute`);
    } else {
      this.logger.log('No rate limit configured');
    }
  }

  /**
   * Process the email queue every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processEmailQueue(): Promise<void> {
    if (this.processingQueue) {
      return; // Already processing
    }

    this.processingQueue = true;

    try {
      const rateLimit = this.configService.get<number>('email.rateLimit', 0);
      const dontSend = this.configService.get<boolean>('email.dontSend', false);

      if (dontSend) {
        // Don't process queue if emails are disabled
        this.processingQueue = false;
        return;
      }

      // Reset counter if we're in a new minute
      const now = Date.now();
      if (now - this.minuteStartTime >= 60000) {
        this.emailsSentThisMinute = 0;
        this.minuteStartTime = now;
      }

      // Calculate how many emails we can send
      const availableSlots =
        rateLimit > 0 ? Math.max(0, rateLimit - this.emailsSentThisMinute) : 100; // Process up to 100 at once if no rate limit

      if (availableSlots === 0) {
        this.processingQueue = false;
        return; // Rate limit reached
      }

      // Get pending emails
      const pendingEmails = await this.emailQueueRepository.find({
        where: { status: EmailStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: availableSlots,
      });

      if (pendingEmails.length === 0) {
        // Only log if we haven't logged recently (avoid spam)
        const now = Date.now();
        if (now - this.lastProcessTime > 60000) {
          // Log once per minute
          this.logger.debug('No pending emails in queue');
          this.lastProcessTime = now;
        }
        this.processingQueue = false;
        return;
      }

      this.logger.log(
        `Processing ${pendingEmails.length} queued emails (rate limit: ${rateLimit}, sent this minute: ${this.emailsSentThisMinute})`,
      );

      for (const emailItem of pendingEmails) {
        try {
          // Mark as processing
          emailItem.status = EmailStatus.PROCESSING;
          await this.emailQueueRepository.save(emailItem);

          // Send the email
          await this.sendQueuedEmail(emailItem);

          // Mark as sent
          emailItem.status = EmailStatus.SENT;
          emailItem.sentAt = new Date();
          await this.emailQueueRepository.save(emailItem);

          this.emailsSentThisMinute++;
          this.logger.log(`Email sent to ${emailItem.to} (${emailItem.subject})`);
        } catch (error) {
          this.logger.error(`Failed to send email ${emailItem.id}:`, error);

          emailItem.status = EmailStatus.FAILED;
          emailItem.attempts += 1;
          emailItem.lastError = error.message || 'Unknown error';
          await this.emailQueueRepository.save(emailItem);
        }

        // Check if we've hit the rate limit
        if (rateLimit > 0 && this.emailsSentThisMinute >= rateLimit) {
          this.logger.log('Rate limit reached, pausing queue processing');
          break;
        }
      }
    } catch (error) {
      // Silently ignore "table doesn't exist" errors during startup
      // TypeORM will create the table with DB_SYNCHRONIZE=true
      if (error.message && error.message.includes("doesn't exist")) {
        // Table not created yet, will retry on next cron
        return;
      }
      this.logger.error('Error processing email queue:');
      this.logger.error(error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Send a queued email
   */
  private async sendQueuedEmail(emailItem: EmailQueue): Promise<void> {
    const mailOptions: any = {
      to: emailItem.to,
      subject: emailItem.subject,
    };

    if (emailItem.template) {
      mailOptions.template = emailItem.template;
      // Parse context if it's a string (some drivers might return JSON as string)
      if (typeof emailItem.context === 'string') {
        try {
          mailOptions.context = JSON.parse(emailItem.context);
        } catch {
          mailOptions.context = {};
        }
      } else {
        mailOptions.context = emailItem.context || {};
      }
    } else if (emailItem.htmlContent) {
      mailOptions.html = emailItem.htmlContent;
    }

    try {
      this.logger.log(`[SMTP] Sending email to: ${mailOptions.to}`);
      this.logger.log(`[SMTP] Subject: ${mailOptions.subject}`);
      this.logger.log(`[SMTP] Template: ${mailOptions.template || 'none (using HTML)'}`);
      if (emailItem.originalTo) {
        this.logger.log(`[SMTP] Original recipient: ${emailItem.originalTo}`);
      }
    } catch (err) {
      this.logger.error('Error logging email send details:', err);
    }

    try {
      const result = await this.mailerService.sendMail(mailOptions);
      this.logger.log(`[SMTP] Email sent successfully. Response: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`[SMTP] Failed to send email: ${error.message}`);
      this.logger.error(`[SMTP] Error details: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
    await this.queueEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  /**
   * Queue an email for sending
   */
  private async queueEmail(options: QueueEmailOptions): Promise<void> {
    const dontSend = this.configService.get<boolean>('email.dontSend', false);
    const redirectTo = this.configService.get<string>('email.redirectTo');

    if (dontSend) {
      this.logger.log(
        `[EMAIL NOT SENT] Would have queued email to ${options.to} with subject "${options.subject}"`,
      );
      return;
    }

    // Apply redirect if configured
    let finalTo = options.to;
    let originalTo = null;

    if (redirectTo) {
      originalTo = options.to;
      finalTo = redirectTo;
      this.logger.log(`Redirecting email from ${originalTo} to ${redirectTo}`);
    }

    // Create queue entry
    const queueItem = this.emailQueueRepository.create({
      to: finalTo,
      originalTo,
      subject: options.subject,
      htmlContent: options.html || null,
      template: options.template || null,
      context: options.context || null,
      status: EmailStatus.PENDING,
      attempts: 0,
    });

    await this.emailQueueRepository.save(queueItem);
    this.logger.log(`Email queued for ${finalTo}: ${options.subject}`);
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const verificationUrl = `${apiUrl}/api/auth/verify-email?token=${token}`;

    await this.queueEmail({
      to: email,
      subject: 'Verify Your Email Address',
      template: './verification',
      context: {
        firstName,
        verificationUrl,
      },
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Welcome to Xerosite!',
      template: './welcome',
      context: {
        firstName,
      },
    });
  }

  async sendTeamInvitationEmail(
    email: string,
    teamName: string,
    teamNumber: number,
  ): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const loginUrl = `${apiUrl}/login`;

    await this.queueEmail({
      to: email,
      subject: `Invitation to join team: ${teamName}`,
      html: `
        <p>You have been invited to join the team <strong>${teamName}</strong> (Team #${teamNumber}).</p>
        <p>Please log in to accept or decline this invitation:</p>
        <p><a href="${loginUrl}">Click here to log in</a></p>
      `,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
  ): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const resetUrl = `${apiUrl}/reset-password/${resetToken}`;

    await this.queueEmail({
      to: email,
      subject: 'Reset Your Password',
      template: './password-reset',
      context: {
        firstName,
        resetUrl,
      },
    });
  }

  async sendFirstUserAdminEmail(email: string, firstName: string): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    const loginUrl = `${apiUrl}/login`;

    await this.queueEmail({
      to: email,
      subject: 'Welcome to FRC Teams - You are the Site Administrator',
      html: `
        <h2>Welcome to FRC Teams!</h2>
        <p>Hello ${firstName},</p>
        <p>Congratulations! You are the <strong>first user</strong> to register on this FRC Teams site, and you have been automatically granted <strong>Site Administrator</strong> privileges.</p>
        <p>As a Site Administrator, you have full access to manage:</p>
        <ul>
          <li>All users on the site</li>
          <li>All teams and their settings</li>
          <li>Site-wide configurations</li>
        </ul>
        <p>You can now log in and start setting up teams for your FRC organization.</p>
        <p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Log In to FRC Teams</a></p>
        <p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
        <p>Best regards,<br>The FRC Teams Team</p>
      `,
    });
  }

  /**
   * Send event notification email
   */
  async sendEventNotificationEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    await this.queueEmail({
      to,
      subject,
      html: htmlContent,
    });
  }

  /**
   * Send test email (for administrators)
   */
  async sendTestEmail(to: string, subject: string, message: string): Promise<void> {
    await this.queueEmail({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Test Message</h2>
          <p style="white-space: pre-wrap;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 0.9em;">This is a test message sent from the admin dashboard.</p>
        </div>
      `,
    });
  }

  /**
   * Clean up old sent emails (older than 30 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldEmails(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await this.emailQueueRepository.delete({
        status: EmailStatus.SENT,
        sentAt: LessThan(thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old emails from queue`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old emails:', error);
    }
  }
}
