import { registerAs } from '@nestjs/config';

export default registerAs('sms', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  dontSend: process.env.SMS_DONT_SEND === 'true',
  redirectTo: process.env.SMS_REDIRECT_TO || null,
}));
