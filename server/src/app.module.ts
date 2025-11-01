import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { DatabaseConfig } from './config/database.config';
import emailConfig from './config/email.config';
import { AppController } from './app.controller';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamsModule } from './modules/teams/teams.module';
import { EmailModule } from './modules/email/email.module';
import { EventsModule } from './modules/events/events.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AdminModule } from './modules/admin/admin.module';
import { MessagesModule } from './modules/messages/messages.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { TeamLinksModule } from './modules/team-links/team-links.module';
import { TeamMediaModule } from './modules/team-media/team-media.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [emailConfig],
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Database module
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // Serve static files from Angular frontend
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser'),
      exclude: ['/api*'],
    }),

    // Feature modules
    HealthModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    EmailModule,
    EventsModule,
    PreferencesModule,
    AdminModule,
    MessagesModule,
    FileStorageModule,
    TeamLinksModule,
    TeamMediaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
