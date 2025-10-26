import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async check() {
    const isDbConnected = this.connection.isInitialized;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbConnected,
      },
    };
  }
}
