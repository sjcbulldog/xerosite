import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UserPhone } from './entities/user-phone.entity';
import { UserAddress } from './entities/user-address.entity';
import { UserParent } from './entities/user-parent.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserEmail,
      UserPhone,
      UserAddress,
      UserParent,
      SubteamLeadPosition,
      SubteamMember,
    ]),
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
