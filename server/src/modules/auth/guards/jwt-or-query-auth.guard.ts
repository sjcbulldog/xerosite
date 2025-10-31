import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtOrQueryAuthGuard extends AuthGuard('jwt') {
  constructor(private jwtService: JwtService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // First try the standard JWT auth (Authorization header)
    try {
      const result = await super.canActivate(context);
      if (result) {
        return true;
      }
    } catch (error) {
      // If header auth fails, try query parameter
    }

    // Try to get token from query parameter
    const token = request.query.token;
    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Verify the token
      const payload = this.jwtService.verify(token);
      
      // Attach user to request (same as standard JWT strategy does)
      request.user = payload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
