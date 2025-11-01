import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { SimpleRegisterUserDto } from '../users/dto/simple-register-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UserState } from '../users/enums/user-state.enum';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(EmailVerificationToken)
    private readonly verificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    // Check if password is valid
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return null;
    }

    // Check user state
    if (user.state === UserState.PENDING) {
      // Resend verification email
      await this.createAndSendVerificationToken(user);

      // Throw a specific exception for pending users
      throw new UnauthorizedException(
        'Your account is pending email verification. A new verification email has been sent to your email address. Please verify your email before logging in.',
      );
    }

    if (user.state === UserState.DISABLED) {
      throw new UnauthorizedException('Your account has been disabled. Please contact support.');
    }

    if (user.state === UserState.ACTIVE || user.state === UserState.ADMIN) {
      // Update last login
      await this.usersService.updateLastLogin(user.id);
      return user;
    }

    return null;
  }

  async register(registerDto: RegisterUserDto): Promise<{
    user: UserResponseDto;
    access_token: string;
  }> {
    // Check if this is the first user
    const userCount = await this.usersService.getUserCount();
    const isFirstUser = userCount === 0;

    // Create user - first user gets active state, others get pending
    const user = await this.usersService.register(registerDto, isFirstUser);

    // Send appropriate email based on user type
    if (isFirstUser) {
      // First user becomes site admin - send welcome email
      await this.emailService.sendFirstUserAdminEmail(user.primaryEmail, user.firstName);
    } else {
      // Regular users get verification email
      await this.createAndSendVerificationToken(user);
    }

    const payload = {
      sub: user.id,
      email: user.primaryEmail,
      fullName: user.fullName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.transformToUserResponse(user),
    };
  }

  async simpleRegister(simpleRegisterDto: SimpleRegisterUserDto): Promise<{
    user: UserResponseDto;
    access_token: string;
  }> {
    // Convert simple DTO to full registration DTO
    const fullRegisterDto: RegisterUserDto = {
      firstName: simpleRegisterDto.firstName,
      lastName: simpleRegisterDto.lastName,
      password: simpleRegisterDto.password,
      emails: [
        {
          email: simpleRegisterDto.email,
          emailType: 'personal',
          isPrimary: true,
        },
      ],
      // Add optional phone if provided
      ...(simpleRegisterDto.phone && {
        phones: [
          {
            phoneNumber: simpleRegisterDto.phone,
            phoneType: 'mobile',
            isPrimary: true,
          },
        ],
      }),
      // Add optional address if provided
      ...(simpleRegisterDto.address && {
        addresses: [
          {
            streetLine1: simpleRegisterDto.address,
            city: simpleRegisterDto.city || '',
            stateProvince: simpleRegisterDto.state || '',
            postalCode: simpleRegisterDto.zipCode || '',
            country: 'USA',
            addressType: 'home',
            isPrimary: true,
          },
        ],
      }),
    };

    return this.register(fullRegisterDto);
  }

  async login(user: User): Promise<{
    user: UserResponseDto;
    access_token: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.primaryEmail,
      fullName: user.fullName,
    };

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: this.transformToUserResponse(user),
    };
  }

  async validateUserById(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  async verifyEmail(token: string): Promise<UserResponseDto> {
    // Find the verification token
    const verificationToken = await this.verificationTokenRepository.findOne({
      where: { token, isUsed: false },
      relations: ['user'],
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark token as used
    verificationToken.isUsed = true;
    verificationToken.usedAt = new Date();
    await this.verificationTokenRepository.save(verificationToken);

    // Update user state to active
    const user = await this.usersService.updateUserState(
      verificationToken.userId,
      UserState.ACTIVE,
    );

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.primaryEmail, user.firstName);

    return this.transformToUserResponse(user);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.state !== UserState.PENDING) {
      throw new BadRequestException('User is already verified');
    }

    // Invalidate old tokens
    await this.verificationTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    // Create and send new verification token
    await this.createAndSendVerificationToken(user);
  }

  private async createAndSendVerificationToken(user: User): Promise<void> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Save token to database
    const verificationToken = this.verificationTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
    });
    await this.verificationTokenRepository.save(verificationToken);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.primaryEmail, user.firstName, token);
  }

  private transformToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      fullName: user.fullName,
      primaryEmail: user.primaryEmail,
      state: user.state,
      isSiteAdmin: user.isSiteAdmin,
      emails: user.emails || [],
      phones: user.phones || [],
      addresses: user.addresses || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return success message even if user doesn't exist (security best practice)
    if (!user) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Delete any existing reset tokens for this user
    await this.passwordResetTokenRepository.delete({ userId: user.id });

    // Create new reset token
    const passwordResetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.primaryEmail, user.firstName, resetToken);

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find the reset token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('This reset token has expired');
    }

    // Update the user's password
    await this.usersService.updatePassword(resetToken.userId, newPassword);

    // Mark token as used
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    return {
      message:
        'Your password has been successfully reset. You can now log in with your new password.',
    };
  }

  async cleanupExpiredResetTokens(): Promise<void> {
    await this.passwordResetTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
