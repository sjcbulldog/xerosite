import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { DownloadToken } from './entities/download-token.entity';

@Injectable()
export class DownloadTokenService {
  private readonly logger = new Logger(DownloadTokenService.name);

  constructor(
    @InjectRepository(DownloadToken)
    private readonly downloadTokenRepository: Repository<DownloadToken>,
  ) {}

  /**
   * Generate a secure download token for an attachment
   * @param messageId The message ID
   * @param fileId The file ID
   * @param teamId The team ID
   * @param expirationHours Hours until token expires (default: 72)
   * @returns The generated token string
   */
  async generateToken(
    messageId: string,
    fileId: string,
    teamId: string,
    expirationHours: number = 72,
  ): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Store token in database
    const downloadToken = this.downloadTokenRepository.create({
      messageId,
      fileId,
      teamId,
      token,
      expiresAt,
    });

    await this.downloadTokenRepository.save(downloadToken);

    return token;
  }

  /**
   * Validate a download token and return associated file information
   * @param token The token string
   * @returns Object with messageId, fileId, and teamId if valid
   * @throws NotFoundException if token is invalid or expired
   */
  async validateToken(token: string): Promise<{
    messageId: string;
    fileId: string;
    teamId: string;
  }> {
    const downloadToken = await this.downloadTokenRepository.findOne({
      where: { token },
    });

    if (!downloadToken) {
      throw new NotFoundException('Invalid download token');
    }

    if (downloadToken.used) {
      throw new NotFoundException('Download token has already been used');
    }

    if (downloadToken.expiresAt < new Date()) {
      throw new NotFoundException('Download token has expired');
    }

    // Mark token as used (one-time use for security)
    await this.downloadTokenRepository.update(downloadToken.id, { used: true });

    return {
      messageId: downloadToken.messageId,
      fileId: downloadToken.fileId,
      teamId: downloadToken.teamId,
    };
  }

  /**
   * Clean up expired download tokens
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.downloadTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.log(`Cleaned up ${result.affected || 0} expired download tokens`);
    } catch (error) {
      this.logger.error('Failed to clean up expired download tokens', error);
    }
  }
}
