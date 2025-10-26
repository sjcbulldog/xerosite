import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get(['/login', '/register', '/dashboard', '/verify-email', '/team/:id'])
  serveFrontend(@Res() res: Response): void {
    res.sendFile(
      join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
    );
  }
}
