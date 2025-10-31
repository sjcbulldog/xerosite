import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  frontendUrl: process.env.API_URL || 'http://localhost:3000',
  dontSend: process.env.EMAIL_DONT_SEND === 'true',
  redirectTo: process.env.EMAIL_REDIRECT_TO || null,
  rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 0, // Seconds to wait between emails (0 means no limit)
}));
