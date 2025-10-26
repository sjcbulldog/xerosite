import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ResponseDto } from '../../common/dto/response.dto';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const health = await this.healthService.check();
    return ResponseDto.success(health, 'Health check successful');
  }
}
