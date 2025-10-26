import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { getConnectionToken } from '@nestjs/typeorm';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const mockConnection = {
      isInitialized: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return health check status', async () => {
    const result = await service.check();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('database');
    expect(result.database.connected).toBe(true);
  });
});
