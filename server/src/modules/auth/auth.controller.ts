import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { SimpleRegisterUserDto } from '../users/dto/simple-register-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterUserDto): Promise<{
    user: UserResponseDto;
    access_token: string;
  }> {
    return this.authService.register(registerDto);
  }

  @Post('simple-register')
  async simpleRegister(@Body() simpleRegisterDto: SimpleRegisterUserDto): Promise<{
    user: UserResponseDto;
    access_token: string;
    message?: string;
  }> {
    const result = await this.authService.simpleRegister(simpleRegisterDto);
    
    // Add message if user is pending verification
    if (result.user.state === 'pending') {
      return {
        ...result,
        message: 'You will be able to login once you verify your email.',
      };
    }
    
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any): Promise<{
    user: UserResponseDto;
    access_token: string;
  }> {
    return this.authService.login(req.user);
  }

  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const apiUrl = this.configService.get('email.apiUrl');
    try {
      await this.authService.verifyEmail(token);
      // Redirect to server root with success message (serves index.html which Angular will handle)
      res.redirect(`${apiUrl}/login?verified=true`);
    } catch (error) {
      // Redirect to server root with error message
      res.redirect(`${apiUrl}/login?verified=false`);
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string): Promise<{
    message: string;
  }> {
    await this.authService.resendVerificationEmail(email);
    return {
      message: 'Verification email sent',
    };
  }
}
