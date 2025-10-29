import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendSmsOptions {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {
    this.logConfiguration();
  }

  private logConfiguration(): void {
    const dontSend = this.configService.get<boolean>('sms.dontSend', false);
    const redirectTo = this.configService.get<string>('sms.redirectTo');
    const accountSid = this.configService.get<string>('sms.accountSid');
    const phoneNumber = this.configService.get<string>('sms.phoneNumber');

    if (!accountSid) {
      this.logger.warn('⚠️  Twilio Account SID not configured (TWILIO_ACCOUNT_SID)');
    }

    if (!phoneNumber) {
      this.logger.warn('⚠️  Twilio phone number not configured (TWILIO_PHONE_NUMBER)');
    }

    if (dontSend) {
      this.logger.warn('⚠️  SMS sending is DISABLED (SMS_DONT_SEND=true)');
    }

    if (redirectTo) {
      this.logger.warn(`⚠️  SMS redirect enabled: All messages will be sent to ${redirectTo}`);
    }

    this.logger.log('SMS service initialized (Twilio)');
  }

  /**
   * Send an SMS message via Twilio API
   */
  async sendSms(options: SendSmsOptions): Promise<boolean> {
    const dontSend = this.configService.get<boolean>('sms.dontSend', false);
    const redirectTo = this.configService.get<string>('sms.redirectTo');
    const accountSid = this.configService.get<string>('sms.accountSid');
    const authToken = this.configService.get<string>('sms.authToken');
    const defaultFrom = this.configService.get<string>('sms.phoneNumber');

    // Validation
    if (!accountSid || !authToken) {
      this.logger.error('Twilio credentials not configured');
      return false;
    }

    if (!defaultFrom && !options.from) {
      this.logger.error('Twilio phone number not configured');
      return false;
    }

    // Handle don't send mode
    if (dontSend) {
      this.logger.log(`[SMS NOT SENT - DISABLED] To: ${options.to}, Message: ${options.message}`);
      return true;
    }

    // Handle redirect
    const actualTo = redirectTo || options.to;
    if (redirectTo) {
      this.logger.log(`[SMS REDIRECTED] Original: ${options.to}, Redirect: ${actualTo}`);
    }

    const fromNumber = options.from || defaultFrom;

    try {
      // Twilio API endpoint
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      this.logger.log(`Sending SMS to ${actualTo} via Twilio...`);

      // Prepare form-urlencoded data
      const formData = new URLSearchParams();
      formData.append('To', actualTo);
      formData.append('From', fromNumber);
      formData.append('Body', options.message);

      // Create Basic Auth header
      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        this.logger.log(
          `✓ SMS sent successfully to ${actualTo} (Message SID: ${data.sid})`,
        );
        return true;
      } else {
        this.logger.error(`✗ SMS send failed: ${data.message || 'Unknown error'}`);
        if (data.code) {
          this.logger.error(`Twilio error code: ${data.code}`);
        }
        return false;
      }
    } catch (error) {
      this.logger.error(`✗ Error sending SMS to ${actualTo}:`, error.message);
      return false;
    }
  }

  /**
   * Send a simple text message (helper method)
   */
  async sendTextMessage(to: string, message: string): Promise<boolean> {
    return this.sendSms({ to, message });
  }

  /**
   * Send event notification via SMS
   */
  async sendEventNotification(
    to: string,
    eventName: string,
    eventTime: Date,
    location: string | null,
    timeDescription: string,
  ): Promise<boolean> {
    const message = this.formatEventNotificationMessage(
      eventName,
      eventTime,
      location,
      timeDescription,
    );
    return this.sendSms({ to, message });
  }

  /**
   * Format event notification message for SMS
   */
  private formatEventNotificationMessage(
    eventName: string,
    eventTime: Date,
    location: string | null,
    timeDescription: string,
  ): string {
    const timeStr = eventTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    let message = `Event Reminder: "${eventName}" is coming up ${timeDescription}.\n`;
    message += `Time: ${timeStr}`;
    
    if (location) {
      message += `\nLocation: ${location}`;
    }

    return message;
  }
}
