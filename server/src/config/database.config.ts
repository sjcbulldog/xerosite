import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const synchronize = this.configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true';
    const logging = this.configService.get<string>('DB_LOGGING', 'false') === 'true';

    return {
      type: 'mysql',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      username: this.configService.get<string>('DB_USERNAME', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_DATABASE', 'xerosite'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize,
      logging,
      timezone: 'Z', // Treat DATETIME columns as UTC
    };
  }
}
