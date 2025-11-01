import { Controller, Post, Body, UseGuards, ForbiddenException, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { TestMessageDto } from './dto/test-message.dto';
import { User } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('test-message')
  async sendTestMessage(@Request() req, @Body() testMessageDto: TestMessageDto) {
    const user: User = req.user;

    // Check if user is site admin
    if (!user.isSiteAdmin) {
      throw new ForbiddenException('Only site administrators can send test messages');
    }

    return this.adminService.sendTestMessage(testMessageDto);
  }
}
